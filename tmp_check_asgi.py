import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
print('CWD:', os.getcwd())
try:
    import vendora.asgi as asgi
    print('vendora.asgi imported, has application:', hasattr(asgi,'application'))
except Exception as e:
    print('import vendora.asgi failed:', repr(e))

# check gunicorn availability
try:
    import importlib
    g = importlib.import_module('gunicorn')
    print('gunicorn module imported')
except Exception as e:
    print('gunicorn import failed:', repr(e))

try:
    u = importlib.import_module('uvicorn')
    print('uvicorn imported')
except Exception as e:
    print('uvicorn import failed:', repr(e))
