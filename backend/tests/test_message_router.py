import pytest
import pytest_asyncio
import sys, os
# allow importing from app package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime
from sqlalchemy import select

from app.models import base
from app.services import message_router
from app.models.message_event import MessageEvent
from app.models.chatbot_instance import ChatbotInstance


@pytest.mark.asyncio
async def test_route_message_creates_contact_and_conversation(tmp_path, monkeypatch):
    # use temporary sqlite database
    db_file = tmp_path / "msg.db"
    monkeypatch.setattr(
        base,
        "get_database_url",
        lambda: f"sqlite+aiosqlite:///{db_file.resolve()}"
    )

    # create schema/tables
    await base.fix_schema()

    # patch RAG pipeline to return predictable answer
    async def fake_rag(query, channel, user_id, active_kb_ids=None, fallback_message=None, system_prompt=None):
        return ("fake answer", [], 1.0)

    monkeypatch.setattr("app.services.rag.process_chat_query", fake_rag)

    # build a minimal chatbot config so route_message doesn't pause
    session_factory = base.get_session_factory()
    async with session_factory() as db:
        bot = ChatbotInstance(
            id="bot1",
            tenant_id="t1",
            name="TestBot",
            status="live"
        )
        db.add(bot)
        await db.commit()

    # construct a sample message event
    event = MessageEvent(
        tenant_id="t1",
        channel="web",
        channel_user_id="user1",
        channel_conversation_id="conv1",
        contact_phone=None,
        contact_email=None,
        contact_name="Tester",
        contact_avatar_url=None,
        message_id="m1",
        message_type="text",
        text="hello",
        raw_payload={},
        timestamp=datetime.utcnow(),
        reply_to_message_id=None,
        media_url=None,
        media_type=None,
        media_caption=None,
        button_payload=None,
        selected_option=None,
    )

    # route the event and then verify DB changes
    async with session_factory() as db:
        await message_router.route_message(event, db)

        # contact created
        from app.models.contact import Contact
        result = await db.execute(select(Contact).where(Contact.tenant_id == "t1"))
        contact = result.scalar_one_or_none()
        assert contact is not None
        assert contact.full_name == "Tester"

        # conversation created
        from app.models.conversation import Conversation
        result = await db.execute(select(Conversation).where(Conversation.tenant_id == "t1"))
        conv = result.scalar_one_or_none()
        assert conv is not None
        assert conv.channel == "web"

        # user message recorded
        from app.models.message import Message
        result = await db.execute(select(Message).where(Message.conversation_id == conv.id))
        msgs = result.scalars().all()
        assert any(m.role == "user" and "hello" in m.content for m in msgs)
