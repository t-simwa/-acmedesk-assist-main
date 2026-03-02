# Errors Skills

Add error reports here when you encounter bugs during development.

Format:
```
fix this: [INFO:     127.0.0.1:55121 - "POST /api/chat HTTP/1.1" 500 Internal Server Error
Error getting user KB preferences: type object 'UserKnowledgeBasePreference' has no attribute 'tenant_id'
Traceback (most recent call last):
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\services\database.py", line 1562, in get_user_knowledge_base_preferences
    select(UserKnowledgeBasePreference).where(UserKnowledgeBasePreference.tenant_id == user_id)
                                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AttributeError: type object 'UserKnowledgeBasePreference' has no attribute 'tenant_id'
Error processing chat request: type object 'UserKnowledgeBasePreference' has no attribute 'tenant_id', session_id=session-1772447380443-nmha0a1ak, query_time_ms=2.90
Traceback (most recent call last):
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\routers\chat.py", line 64, in chat
    active_kb_ids = await database.get_active_knowledge_base_ids(current_user.id)
                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\services\database.py", line 1653, in get_active_knowledge_base_ids
    prefs = await get_user_knowledge_base_preferences(user_id)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\Ted Simwa\Desktop\Vanity\Work\IT\my-projects\acmedesk-assist-main\backend\app\services\database.py", line 1562, in get_user_knowledge_base_preferences
    select(UserKnowledgeBasePreference).where(UserKnowledgeBasePreference.tenant_id == user_id)]
```

The assistant will analyze and provide fixes.
