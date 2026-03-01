"""
Chatbot Configuration API endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select

from ..dependencies.auth import get_current_user
from ..models.base import get_db_session
from ..models.user import User
from ..models.chatbot_instance import ChatbotInstance, WidgetPosition

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


@router.get("/config")
async def get_chatbot_config(
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Get chatbot configuration for the current tenant.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found"
        )
    
    return {
        "id": chatbot.id,
        "name": chatbot.name,
        "avatar_url": chatbot.avatar_url,
        "brand_color": chatbot.brand_color,
        "secondary_color": chatbot.secondary_color,
        "greeting_message": chatbot.greeting_message,
        "fallback_message": chatbot.fallback_message,
        "escalation_message": chatbot.escalation_message,
        "offline_message": chatbot.offline_message,
        "response_tone": chatbot.response_tone.value if chatbot.response_tone else "professional",
        "response_length": chatbot.response_length.value if chatbot.response_length else "medium",
        "show_citations": chatbot.show_citations,
        "show_typing": chatbot.show_typing,
        "show_powered_by": chatbot.show_powered_by,
        "widget_position": chatbot.widget_position.value if chatbot.widget_position else "bottom_right",
        "allowed_domains": chatbot.allowed_domains or [],
        "status": chatbot.status.value if chatbot.status else "paused"
    }


@router.put("/config")
async def update_chatbot_config(
    config: dict,
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Update chatbot configuration.
    """
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found"
        )
    
    allowed_fields = [
        'name', 'avatar_url', 'brand_color', 'secondary_color',
        'greeting_message', 'fallback_message', 'escalation_message',
        'offline_message', 'response_tone', 'response_length',
        'show_citations', 'show_typing', 'show_powered_by', 'widget_position'
    ]
    
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
        
        if not chatbot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chatbot not found"
            )
        
        for key, value in config.items():
            if key in allowed_fields and hasattr(chatbot, key):
                if key == 'widget_position':
                    try:
                        setattr(chatbot, key, WidgetPosition(value))
                    except ValueError:
                        pass
                else:
                    setattr(chatbot, key, value)
        
        await session.commit()
        
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
    
    return {
        "id": chatbot.id,
        "name": chatbot.name,
        "avatar_url": chatbot.avatar_url,
        "brand_color": chatbot.brand_color,
        "secondary_color": chatbot.secondary_color,
        "greeting_message": chatbot.greeting_message,
        "fallback_message": chatbot.fallback_message,
        "escalation_message": chatbot.escalation_message,
        "offline_message": chatbot.offline_message,
        "response_tone": chatbot.response_tone.value if chatbot.response_tone else "professional",
        "response_length": chatbot.response_length.value if chatbot.response_length else "medium",
        "show_citations": chatbot.show_citations,
        "show_typing": chatbot.show_typing,
        "show_powered_by": chatbot.show_powered_by,
        "widget_position": chatbot.widget_position.value if chatbot.widget_position else "bottom_right",
        "allowed_domains": chatbot.allowed_domains or [],
        "status": chatbot.status.value if chatbot.status else "paused"
    }


@router.put("/domains")
async def update_allowed_domains(
    config: dict,
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Update allowed domains for the chatbot.
    """
    domains = config.get('allowed_domains', [])
    
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(
                ChatbotInstance.tenant_id == current_user.tenant_id
            )
        )
        chatbot = result.scalar_one_or_none()
        
        if not chatbot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chatbot not found"
            )
        
        chatbot.allowed_domains = domains
        await session.commit()
    
    return {
        "id": chatbot.id,
        "allowed_domains": chatbot.allowed_domains or []
    }
