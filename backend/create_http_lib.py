#!/usr/bin/env python3
"""Deprecated: use backend/tools/create_http_lib.py instead."""
import os
import sys

TOOLS = os.path.join(os.path.dirname(__file__), 'tools', 'create_http_lib.py')
if os.path.exists(TOOLS):
    with open(TOOLS, 'r', encoding='utf-8') as f:
        exec(compile(f.read(), TOOLS, 'exec'), {})
else:
    print("This helper has moved to backend/tools/create_http_lib.py")
