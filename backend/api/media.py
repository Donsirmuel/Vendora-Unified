import mimetypes
import os

from django.conf import settings
from django.http import FileResponse, Http404
from django.utils._os import safe_join


def serve_media_file(request, file_path: str):
    if not file_path:
        raise Http404("File not found")

    normalized = file_path.lstrip("/")
    try:
        absolute_path = safe_join(str(settings.MEDIA_ROOT), normalized)
    except Exception:
        raise Http404("Invalid media path")

    if not os.path.exists(absolute_path) or not os.path.isfile(absolute_path):
        raise Http404("File not found")

    content_type, _ = mimetypes.guess_type(absolute_path)
    content_type = content_type or "application/octet-stream"
    return FileResponse(open(absolute_path, "rb"), content_type=content_type)
