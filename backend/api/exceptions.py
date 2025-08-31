from typing import Any
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = exception_handler(exc, context)
    if response is not None:
        # Normalize error structure
        data = {
            "detail": response.data,
            "status_code": response.status_code,
        }
        response.data = data
        return response

    # Fallback for unhandled exceptions
    return Response(
        {"detail": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


