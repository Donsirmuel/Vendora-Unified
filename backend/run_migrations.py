import os
import sys

# Ensure we can import the Django project from the backend directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "vendora.settings")

try:
    import django
    django.setup()
    from django.core.management import call_command

    print("Running makemigrations...")
    call_command("makemigrations")

    print("Applying migrations...")
    call_command("migrate")

    print("Done.")
except Exception as e:
    # Print full traceback for easier debugging in CI/terminals
    import traceback
    traceback.print_exc()
    sys.exit(1)
