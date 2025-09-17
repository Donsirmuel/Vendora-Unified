"""Environment sanity checker (Task 34)

Usage:
    python env_sanity.py  # returns exit code 0 if OK, 1 if hard failures, 2 if warnings only

Goals:
    - Early fail fast on truly required configuration
    - Surface warnings for recommended (optional) settings when missing
    - Provide a concise tabular/text output for CI or startup scripts

Exit Codes:
    0 -> All required present (warnings may exist)
    1 -> One or more required missing / invalid
    2 -> Only warnings (no hard failures) but at least one recommended item missing

Integrate by calling this script in your start command before launching the server.
"""
from __future__ import annotations
import os, sys, json, shutil
from typing import List, Dict, Any, Tuple

# Define required and optional environment variables with simple validation rules
# Each entry: (env_var_name, requirement, description, validator?)
# requirement: 'required' | 'recommended' | 'optional'
# validator: callable(str) -> bool

def _non_empty(val: str) -> bool:
    return bool(val.strip())

def _int(val: str) -> bool:
    try:
        int(val); return True
    except: return False

def _float(val: str) -> bool:
    try:
        float(val); return True
    except: return False

VARIABLES: List[Dict[str, Any]] = [
    # Core security
    {"name": "SECRET_KEY", "requirement": "required", "description": "Django secret key", "validator": _non_empty},
    # Deployment toggles
    {"name": "DEBUG", "requirement": "required", "description": "Debug mode flag (should be false in prod)", "validator": lambda v: v.lower() in {"true","false","1","0"}},
    {"name": "ALLOWED_HOSTS", "requirement": "required", "description": "Comma list of allowed hosts", "validator": _non_empty},
    # Database & persistence
    {"name": "DATABASE_URL", "requirement": "recommended", "description": "URL for production DB (fallback to sqlite if absent)"},
    {"name": "DB_CONN_MAX_AGE", "requirement": "optional", "description": "Persistent DB connection lifetime", "validator": _int},
    # Trial / product config
    {"name": "TRIAL_DAYS", "requirement": "recommended", "description": "Length of free trial in days", "validator": _int},
    # Orders
    {"name": "ORDER_AUTO_EXPIRE_MINUTES", "requirement": "recommended", "description": "Default order auto-expire window (minutes)", "validator": _int},
    # CORS / Frontend
    {"name": "CORS_ALLOWED_ORIGINS", "requirement": "recommended", "description": "Allowed CORS origins"},
    {"name": "FRONTEND_URL", "requirement": "recommended", "description": "Public base URL of frontend"},
    # Email
    {"name": "EMAIL_BACKEND", "requirement": "recommended", "description": "Django email backend path"},
    {"name": "DEFAULT_FROM_EMAIL", "requirement": "recommended", "description": "Default from address"},
    {"name": "EMAIL_HOST", "requirement": "optional", "description": "SMTP host"},
    {"name": "EMAIL_PORT", "requirement": "optional", "description": "SMTP port", "validator": _int},
    {"name": "EMAIL_HOST_USER", "requirement": "optional", "description": "SMTP username"},
    {"name": "EMAIL_HOST_PASSWORD", "requirement": "optional", "description": "SMTP password"},
    # Push (Web Push / VAPID)
    {"name": "VAPID_PUBLIC_KEY", "requirement": "recommended", "description": "Web Push VAPID public key"},
    {"name": "VAPID_PRIVATE_KEY", "requirement": "recommended", "description": "Web Push VAPID private key"},
    {"name": "VAPID_EMAIL", "requirement": "optional", "description": "Contact email in VAPID claims"},
    # Telegram Integration
    {"name": "TELEGRAM_BOT_TOKEN", "requirement": "recommended", "description": "Telegram bot token"},
    {"name": "TELEGRAM_BOT_USERNAME", "requirement": "recommended", "description": "Telegram bot username"},
    {"name": "TELEGRAM_WEBHOOK_URL", "requirement": "optional", "description": "Telegram webhook URL"},
    {"name": "TELEGRAM_WEBHOOK_SECRET", "requirement": "optional", "description": "Webhook shared secret"},
    # Security headers & Sentry
    {"name": "CONTENT_SECURITY_POLICY", "requirement": "optional", "description": "Override CSP"},
    {"name": "REFERRER_POLICY", "requirement": "optional", "description": "Override referrer policy"},
    {"name": "PERMISSIONS_POLICY", "requirement": "optional", "description": "Override permissions policy"},
    {"name": "X_FRAME_OPTIONS", "requirement": "optional", "description": "Override X-Frame-Options"},
    {"name": "SENTRY_DSN", "requirement": "optional", "description": "Sentry DSN for error tracking"},
    {"name": "SENTRY_TRACES_SAMPLE_RATE", "requirement": "optional", "description": "Tracing sample rate", "validator": _float},
    {"name": "SENTRY_PROFILES_SAMPLE_RATE", "requirement": "optional", "description": "Profiling sample rate", "validator": _float},
    # Logging
    {"name": "LOG_LEVEL", "requirement": "optional", "description": "Log level"},
    {"name": "LOG_JSON", "requirement": "optional", "description": "Enable JSON logs flag", "validator": lambda v: v.lower() in {"true","false","1","0"}},
    {"name": "DB_LOG_LEVEL", "requirement": "optional", "description": "Database log level"},
    # Throttling (Task 14)
    {"name": "THROTTLE_ANON", "requirement": "optional", "description": "Anon request rate"},
    {"name": "THROTTLE_USER", "requirement": "optional", "description": "Authenticated user base rate"},
    {"name": "THROTTLE_TRIAL_USER", "requirement": "optional", "description": "Trial user rate override"},
    {"name": "THROTTLE_ORDER_WRITE", "requirement": "optional", "description": "Order write scope rate"},
    {"name": "THROTTLE_RATES_WRITE", "requirement": "optional", "description": "Rates write scope rate"},
    {"name": "THROTTLE_AUTH_BURST", "requirement": "optional", "description": "Auth burst scope rate"},
]

COLOR = sys.stdout.isatty()

def style(txt: str, code: str) -> str:
    if not COLOR: return txt
    return f"\x1b[{code}m{txt}\x1b[0m"

def check_var(entry: Dict[str, Any]) -> Tuple[str, str, str]:
    name = entry["name"]
    requirement = entry["requirement"]
    val = os.getenv(name, "").strip()
    present = bool(val)
    validator = entry.get("validator")
    valid = True
    if present and validator:
        try:
            valid = bool(validator(val))
        except Exception:
            valid = False
    status = "OK" if present and valid else ("MISSING" if not present else "INVALID")
    return name, requirement, status


def main() -> int:
    required_fail = []
    warnings = []
    rows = []
    for var in VARIABLES:
        name, req, status = check_var(var)
        rows.append((name, req, status))
        if req == 'required' and status != 'OK':
            required_fail.append(name)
        elif req == 'recommended' and status != 'OK':
            warnings.append(name)
    # Output
    max_name = max(len(r[0]) for r in rows)
    max_req = max(len(r[1]) for r in rows)
    header = f"{style('VAR'.ljust(max_name), '1;37')}  {style('REQ'.ljust(max_req), '1;37')}  {style('STATUS', '1;37')}"
    print(header)
    for name, req, status in rows:
        color_code = '32' if status == 'OK' else ('31' if status in ('MISSING','INVALID') and req=='required' else '33')
        print(f"{style(name.ljust(max_name), '36')}  {style(req.ljust(max_req), '35')}  {style(status, color_code)}")

    if required_fail:
        print("\n" + style("ERROR: Missing/invalid required variables:", '31;1'), ', '.join(required_fail))
    if warnings:
        print("\n" + style("WARN: Recommended variables absent/invalid:", '33;1'), ', '.join(warnings))

    if required_fail:
        return 1
    if warnings:
        return 2
    return 0

if __name__ == '__main__':
    code = main()
    if '--json' in sys.argv:
        # simple machine readable output
        summary = {
            'exit_code': code,
            'required_missing': [v['name'] for v in VARIABLES if v['requirement'] == 'required' and (not os.getenv(v['name']) or (v.get('validator') and not v['validator'](os.getenv(v['name']))))],
        }
        print(json.dumps(summary))
    sys.exit(code)
