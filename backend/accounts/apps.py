from django.apps import AppConfig
from typing import ClassVar

class AccountsConfig(AppConfig):
    default_auto_field: ClassVar[str] = 'django.db.models.BigAutoField'
    name: ClassVar[str] = 'accounts'
    def ready(self) -> None:
        # import signals to register them
        try:
            import accounts.signals  # noqa: F401
        except Exception:
            pass
