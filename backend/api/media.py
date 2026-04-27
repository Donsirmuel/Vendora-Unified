import mimetypes
import os

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.utils._os import safe_join
from rest_framework_simplejwt.authentication import JWTAuthentication


def _resolve_request_user(request):
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        return user
    try:
        auth_result = JWTAuthentication().authenticate(request)
        if auth_result:
            return auth_result[0]
    except Exception:
        pass
    return None


def _is_authorized_media_path(user, normalized_path: str) -> bool:
    # Admin users can access media for support and moderation workflows.
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return True

    folder = normalized_path.split("/", 1)[0]

    if folder == "avatars":
        from accounts.models import Vendor
        return Vendor.objects.filter(id=user.id, avatar=normalized_path).exists()

    if folder == "proofs":
        from transactions.models import Transaction
        return Transaction.objects.filter(order__vendor=user, proof=normalized_path).exists()

    if folder == "vendor_proofs":
        from transactions.models import Transaction
        return Transaction.objects.filter(order__vendor=user, vendor_proof=normalized_path).exists()

    if folder == "payment_receipts":
        from accounts.models import PaymentRequest
        return PaymentRequest.objects.filter(vendor=user, receipt=normalized_path).exists()

    # Deny unknown media directories by default.
    return False


def serve_media_file(request, file_path: str):
    if not file_path:
        raise Http404("File not found")

    user = _resolve_request_user(request)
    if not user:
        return HttpResponse(status=401)

    normalized = file_path.lstrip("/")
    if not _is_authorized_media_path(user, normalized):
        return HttpResponse(status=403)

    try:
        absolute_path = safe_join(str(settings.MEDIA_ROOT), normalized)
    except Exception:
        raise Http404("Invalid media path")

    if not os.path.exists(absolute_path) or not os.path.isfile(absolute_path):
        raise Http404("File not found")

    content_type, _ = mimetypes.guess_type(absolute_path)
    content_type = content_type or "application/octet-stream"
    return FileResponse(open(absolute_path, "rb"), content_type=content_type)
