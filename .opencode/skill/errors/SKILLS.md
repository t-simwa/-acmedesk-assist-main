# Errors Skills

Add error reports here when you encounter bugs during development.

Format:
```
fix this: [NFO:     127.0.0.1:60249 - "GET /api/chatbot/config HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1709, in _object_value_for_elem
    return self._object_lookup[elem]  # type: ignore[return-value]    
           ~~~~~~~~~~~~~~~~~~~^^^^^^
KeyError: 'bottom_right'

The above exception was the direct cause of the following exception:  

Traceback (most recent call last):
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 426, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 84, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\applications.py", line 1106, in __call__       
    await super().__call__(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\applications.py", line 122, in __call__      
    await self.middleware_stack(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\errors.py", line 184, in __call__ 
    raise exc
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\errors.py", line 162, in __call__ 
    await self.app(scope, receive, _send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\cors.py", line 91, in __call__    
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\cors.py", line 146, in simple_response
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\exceptions.py", line 79, in __call__
    raise exc
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\exceptions.py", line 68, in __call__
    await self.app(scope, receive, sender)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 20, in __call__
    raise e
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 17, in __call__
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 718, in __call__
    await route.handle(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 66, in app
    response = await func(request)
               ^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\routing.py", line 274, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\routing.py", line 191, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\routers\chatbot.py", line 161, in get_chatbot_config
    result = await session.execute(
             ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\ext\asyncio\session.py", line 449, in execute
    result = await greenlet_spawn(
             ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\util\_concurrency_py3k.py", line 203, in greenlet_spawn
    result = context.switch(value)
             ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\session.py", line 2351, in execute      
    return self._execute_internal(
           ^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\session.py", line 2249, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(    
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\context.py", line 309, in orm_execute_statement
    return cls.orm_setup_cursor_result(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\context.py", line 616, in orm_setup_cursor_result
    return loading.instances(result, querycontext)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\loading.py", line 262, in instances     
    _prebuffered = list(chunks(None))
                   ^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\loading.py", line 220, in chunks        
    fetch = cursor._raw_all_rows()
            ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\engine\result.py", line 553, in _raw_all_rows
    return [make_row(row) for row in rows]
            ^^^^^^^^^^^^^
  File "lib/sqlalchemy/cyextension/resultproxy.pyx", line 22, in sqlalchemy.cyextension.resultproxy.BaseRow.__init__
  File "lib/sqlalchemy/cyextension/resultproxy.pyx", line 79, in sqlalchemy.cyextension.resultproxy._apply_processors
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1829, in process     
    value = self._object_value_for_elem(value)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1711, in _object_value_for_elem
    raise LookupError(
LookupError: 'bottom_right' is not among the defined enum values. Enum name: widgetposition. Possible values: BOTTOM_RIGH.., BOTTOM_LEFT, TOP_RIGHT, TOP_LEFT
INFO:     127.0.0.1:59048 - "GET /api/chatbot/config HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1709, in _object_value_for_elem
    return self._object_lookup[elem]  # type: ignore[return-value]    
           ~~~~~~~~~~~~~~~~~~~^^^^^^
KeyError: 'bottom_right'

The above exception was the direct cause of the following exception:  

Traceback (most recent call last):
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 426, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 84, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\applications.py", line 1106, in __call__       
    await super().__call__(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\applications.py", line 122, in __call__      
    await self.middleware_stack(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\errors.py", line 184, in __call__ 
    raise exc
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\errors.py", line 162, in __call__ 
    await self.app(scope, receive, _send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\cors.py", line 91, in __call__    
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\cors.py", line 146, in simple_response
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\exceptions.py", line 79, in __call__
    raise exc
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\exceptions.py", line 68, in __call__
    await self.app(scope, receive, sender)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 20, in __call__
    raise e
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 17, in __call__
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 718, in __call__
    await route.handle(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 66, in app
    response = await func(request)
               ^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\routing.py", line 274, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\routing.py", line 191, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\routers\chatbot.py", line 161, in get_chatbot_config
    result = await session.execute(
             ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\ext\asyncio\session.py", line 449, in execute
    result = await greenlet_spawn(
             ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\util\_concurrency_py3k.py", line 203, in greenlet_spawn
    result = context.switch(value)
             ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\session.py", line 2351, in execute      
    return self._execute_internal(
           ^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\session.py", line 2249, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(    
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\context.py", line 309, in orm_execute_statement
    return cls.orm_setup_cursor_result(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\context.py", line 616, in orm_setup_cursor_result
    return loading.instances(result, querycontext)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\loading.py", line 262, in instances     
    _prebuffered = list(chunks(None))
                   ^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\loading.py", line 220, in chunks        
    fetch = cursor._raw_all_rows()
            ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\engine\result.py", line 553, in _raw_all_rows
    return [make_row(row) for row in rows]
            ^^^^^^^^^^^^^
  File "lib/sqlalchemy/cyextension/resultproxy.pyx", line 22, in sqlalchemy.cyextension.resultproxy.BaseRow.__init__
  File "lib/sqlalchemy/cyextension/resultproxy.pyx", line 79, in sqlalchemy.cyextension.resultproxy._apply_processors
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1829, in process     
    value = self._object_value_for_elem(value)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1711, in _object_value_for_elem
    raise LookupError(
LookupError: 'bottom_right' is not among the defined enum values. Enum name: widgetposition. Possible values: BOTTOM_RIGH.., BOTTOM_LEFT, TOP_RIGHT, TOP_LEFT
INFO:     127.0.0.1:53186 - "GET /api/chatbot/config HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1709, in _object_value_for_elem
    return self._object_lookup[elem]  # type: ignore[return-value]    
           ~~~~~~~~~~~~~~~~~~~^^^^^^
KeyError: 'bottom_right'

The above exception was the direct cause of the following exception:  

Traceback (most recent call last):
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 426, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 84, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\applications.py", line 1106, in __call__       
    await super().__call__(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\applications.py", line 122, in __call__      
    await self.middleware_stack(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\errors.py", line 184, in __call__ 
    raise exc
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\errors.py", line 162, in __call__ 
    await self.app(scope, receive, _send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\cors.py", line 91, in __call__    
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\cors.py", line 146, in simple_response
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\exceptions.py", line 79, in __call__
    raise exc
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\exceptions.py", line 68, in __call__
    await self.app(scope, receive, sender)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 20, in __call__
    raise e
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 17, in __call__
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 718, in __call__
    await route.handle(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 66, in app
    response = await func(request)
               ^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\routing.py", line 274, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\routing.py", line 191, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\routers\chatbot.py", line 161, in get_chatbot_config
    result = await session.execute(
             ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\ext\asyncio\session.py", line 449, in execute
    result = await greenlet_spawn(
             ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\util\_concurrency_py3k.py", line 203, in greenlet_spawn
    result = context.switch(value)
             ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\session.py", line 2351, in execute      
    return self._execute_internal(
           ^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\session.py", line 2249, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(    
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\context.py", line 309, in orm_execute_statement
    return cls.orm_setup_cursor_result(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\context.py", line 616, in orm_setup_cursor_result
    return loading.instances(result, querycontext)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\loading.py", line 262, in instances     
    _prebuffered = list(chunks(None))
                   ^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\loading.py", line 220, in chunks        
    fetch = cursor._raw_all_rows()
            ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\engine\result.py", line 553, in _raw_all_rows
    return [make_row(row) for row in rows]
            ^^^^^^^^^^^^^
  File "lib/sqlalchemy/cyextension/resultproxy.pyx", line 22, in sqlalchemy.cyextension.resultproxy.BaseRow.__init__
  File "lib/sqlalchemy/cyextension/resultproxy.pyx", line 79, in sqlalchemy.cyextension.resultproxy._apply_processors
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1829, in process     
    value = self._object_value_for_elem(value)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1711, in _object_value_for_elem
    raise LookupError(
LookupError: 'bottom_right' is not among the defined enum values. Enum name: widgetposition. Possible values: BOTTOM_RIGH.., BOTTOM_LEFT, TOP_RIGHT, TOP_LEFT
INFO:     127.0.0.1:64972 - "GET /api/chatbot/config HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1709, in _object_value_for_elem
    return self._object_lookup[elem]  # type: ignore[return-value]    
           ~~~~~~~~~~~~~~~~~~~^^^^^^
KeyError: 'bottom_right'

The above exception was the direct cause of the following exception:  

Traceback (most recent call last):
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 426, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 84, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\applications.py", line 1106, in __call__       
    await super().__call__(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\applications.py", line 122, in __call__      
    await self.middleware_stack(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\errors.py", line 184, in __call__ 
    raise exc
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\errors.py", line 162, in __call__ 
    await self.app(scope, receive, _send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\cors.py", line 91, in __call__    
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\cors.py", line 146, in simple_response
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\exceptions.py", line 79, in __call__
    raise exc
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\middleware\exceptions.py", line 68, in __call__
    await self.app(scope, receive, sender)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 20, in __call__
    raise e
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 17, in __call__
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 718, in __call__
    await route.handle(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\starlette\routing.py", line 66, in app
    response = await func(request)
               ^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\routing.py", line 274, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\fastapi\routing.py", line 191, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\routers\chatbot.py", line 161, in get_chatbot_config
    result = await session.execute(
             ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\ext\asyncio\session.py", line 449, in execute
    result = await greenlet_spawn(
             ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\util\_concurrency_py3k.py", line 203, in greenlet_spawn
    result = context.switch(value)
             ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\session.py", line 2351, in execute      
    return self._execute_internal(
           ^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\session.py", line 2249, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(    
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\context.py", line 309, in orm_execute_statement
    return cls.orm_setup_cursor_result(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\context.py", line 616, in orm_setup_cursor_result
    return loading.instances(result, querycontext)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\loading.py", line 262, in instances     
    _prebuffered = list(chunks(None))
                   ^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\orm\loading.py", line 220, in chunks        
    fetch = cursor._raw_all_rows()
            ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\engine\result.py", line 553, in _raw_all_rows
    return [make_row(row) for row in rows]
            ^^^^^^^^^^^^^
  File "lib/sqlalchemy/cyextension/resultproxy.pyx", line 22, in sqlalchemy.cyextension.resultproxy.BaseRow.__init__
  File "lib/sqlalchemy/cyextension/resultproxy.pyx", line 79, in sqlalchemy.cyextension.resultproxy._apply_processors
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1829, in process     
    value = self._object_value_for_elem(value)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\AppData\Local\Programs\Python\Python312\Lib\site-packages\sqlalchemy\sql\sqltypes.py", line 1711, in _object_value_for_elem
    raise LookupError(
LookupError: 'bottom_right' is not among the defined enum values. Enum name: widgetposition. Possible values: BOTTOM_RIGH.., BOTTOM_LEFT, TOP_RIGHT, TOP_LEFT
]
```

The assistant will analyze and provide fixes.
