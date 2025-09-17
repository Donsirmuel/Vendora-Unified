from typing import Any, Tuple
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def _flatten_errors(data: Any) -> Tuple[str, dict | None]:
    """
    Convert DRF error responses into a single string message and optional field errors dict.
    Examples of input data:
    - {"detail": "Invalid token"}
    - {"email": ["This field is required."], "password": ["This field is required."]}
    - ["Something went wrong"]
    - "Simple error message"
    """
    # String
    if isinstance(data, str):
        return data, None

    # List of messages
    if isinstance(data, list):
        return "; ".join(str(item) for item in data), None

    # Dict of errors
    if isinstance(data, dict):
        # If it already has a 'detail' key
        if "detail" in data:
            detail_val = data.get("detail")
            # If the nested detail is a string, prefer it
            if isinstance(detail_val, str):
                return detail_val, None
            # Otherwise, flatten nested structures
            nested_msg, nested_errors = _flatten_errors(detail_val)
            return nested_msg, nested_errors

        # Field-level errors
        parts = []
        field_errors: dict[str, str] = {}
        for field, messages in data.items():
            if isinstance(messages, list):
                msg_text = "; ".join(str(m) for m in messages)
            elif isinstance(messages, dict):
                msg_text, _ = _flatten_errors(messages)
            else:
                msg_text = str(messages)
            parts.append(f"{field}: {msg_text}")
            field_errors[field] = msg_text

        if parts:
            return "; ".join(parts), field_errors or None

    # Fallback
    return "An error occurred", None


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = exception_handler(exc, context)
    if response is not None:
        message, field_errors = _flatten_errors(response.data)
        normalized = {
            "detail": message,
            "errors": field_errors,
            "code": response.status_code,
        }
        response.data = normalized
        return response

    # Fallback for unhandled exceptions
    return Response(
        {"detail": "Internal server error", "code": status.HTTP_500_INTERNAL_SERVER_ERROR},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


