import os, sys
os.environ['DJANGO_SETTINGS_MODULE'] = 'vendora.settings'
print('PYTHON:', sys.executable)
try:
    import vendora.asgi as a
    print('vendora.asgi imported, has application:', hasattr(a, 'application'))
except Exception as e:
    print('import vendora.asgi failed:', repr(e))
try:
    import gunicorn
    print('gunicorn available')
except Exception as e:
    print('gunicorn missing:', repr(e))
try:
    import uvicorn
    print('uvicorn available')
except Exception as e:
    print('uvicorn missing:', repr(e))
