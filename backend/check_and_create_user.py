#!/usr/bin/env python3
"""Deprecated: use backend/tools/check_and_create_user.py instead."""
import os
TOOLS = os.path.join(os.path.dirname(__file__), 'tools', 'check_and_create_user.py')
if os.path.exists(TOOLS):
    with open(TOOLS, 'r', encoding='utf-8') as f:
        exec(compile(f.read(), TOOLS, 'exec'), {})
else:
    print("This helper has moved to backend/tools/check_and_create_user.py")
