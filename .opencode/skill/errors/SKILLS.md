# Errors Skills

Add error reports here when you encounter bugs during development.

Format:
```
fix this: [Process SpawnProcess-1:
Traceback (most recent call last):
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\multiprocessing\process.py", line 314, in _bootstrap
    self.run()
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\multiprocessing\process.py", line 108, in run
    self._target(*self._args, **self._kwargs)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\_subprocess.py", line 76, in subprocess_started
    target(sockets=sockets)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\server.py", line 61, in run
    return asyncio.run(self.serve(sockets=sockets))
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\asyncio\runners.py", line 194, in run
    return runner.run(main)
           ^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\asyncio\runners.py", line 118, in run
    return self._loop.run_until_complete(task)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\asyncio\base_events.py", line 687, in run_until_complete
    return future.result()
           ^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\server.py", line 68, in serve
    config.load()
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\config.py", line 467, in load
    self.loaded_app = import_from_string(self.app)
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\importer.py", line 21, in import_from_string
    module = importlib.import_module(module_str)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\importlib\__init__.py", line 90, in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<frozen importlib._bootstrap>", line 1387, in _gcd_import
  File "<frozen importlib._bootstrap>", line 1360, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1310, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
  File "<frozen importlib._bootstrap>", line 1387, in _gcd_import
  File "<frozen importlib._bootstrap>", line 1360, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1331, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 935, in _load_unlocked
  File "<frozen importlib._bootstrap_external>", line 995, in exec_module
  File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\__init__.py", line 7, in <module>
    from .main import app
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\main.py", line 221
    app.include_router(channel_settings.router)
IndentationError: unexpected indent

]
```

The assistant will analyze and provide fixes.
