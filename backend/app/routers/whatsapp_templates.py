"""
WhatsApp Message Templates API endpoints.

Provides CRUD operations for WhatsApp message templates via Meta Graph API.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from ..routers.auth import get_current_user
from ..models.user import User
from ..services import whatsapp_templates as templates_service
from ..schemas.channel_settings import WhatsAppTemplateCreate, WhatsAppTemplateStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/channels/whatsapp/templates", tags=["whatsapp-templates"])


@router.get("", response_model=List[WhatsAppTemplateStatus])
async def list_templates(
    current_user: User = Depends(get_current_user),
) -> List[WhatsAppTemplateStatus]:
    """
    List all WhatsApp message templates.
    
    Fetches fresh status from Meta API and returns combined list.
    """
    try:
        return await templates_service.list_templates(current_user.tenant_id)
    except Exception as e:
        logger.error(f"Failed to list templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=dict)
async def submit_template(
    template: WhatsAppTemplateCreate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Submit a new message template to Meta for approval.
    
    Templates are reviewed by Meta and typically approved within 24-48 hours.
    """
    try:
        return await templates_service.submit_template(current_user.tenant_id, template)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to submit template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=dict)
async def submit_templates_batch(
    templates: List[WhatsAppTemplateCreate],
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Submit multiple templates at once.
    
    Returns summary of submitted templates and any failures.
    """
    results = []
    failures = []
    
    for template in templates:
        try:
            result = await templates_service.submit_template(current_user.tenant_id, template)
            results.append(result)
        except Exception as e:
            failures.append({
                "name": template.name,
                "error": str(e),
            })
    
    return {
        "submitted": len(results),
        "failed": len(failures),
        "results": results,
        "failures": failures,
    }


@router.get("/{template_name}", response_model=WhatsAppTemplateStatus)
async def get_template(
    template_name: str,
    current_user: User = Depends(get_current_user),
) -> WhatsAppTemplateStatus:
    """Get a specific template by name."""
    template = await templates_service.get_template_by_name(current_user.tenant_id, template_name)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
    return template


@router.delete("/{template_name}", response_model=dict)
async def delete_template(
    template_name: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Delete a message template.
    
    Note: Templates that are currently in use by active campaigns cannot be deleted.
    """
    try:
        return await templates_service.delete_template(current_user.tenant_id, template_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh", response_model=List[WhatsAppTemplateStatus])
async def refresh_template_statuses(
    current_user: User = Depends(get_current_user),
) -> List[WhatsAppTemplateStatus]:
    """
    Force refresh template statuses from Meta API.
    
    Useful after Meta has reviewed templates to get updated approval status.
    """
    try:
        return await templates_service.list_templates(current_user.tenant_id)
    except Exception as e:
        logger.error(f"Failed to refresh templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))
