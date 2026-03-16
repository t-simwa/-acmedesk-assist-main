"""
Leads admin API router (Milestone 7.5).

Endpoints:
  GET  /api/leads/list                      — paginated list with filters + stats
  GET  /api/leads/{lead_id}                 — full lead detail
  PATCH /api/leads/{lead_id}/status         — update lead status
  POST  /api/leads/{lead_id}/notes          — add internal note
  POST  /api/leads/{lead_id}/score          — recalculate lead score
  POST  /api/leads/bulk                     — bulk action (status_change / delete / export)
"""

from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query

from ..schemas.leads import (
    LeadListResponse,
    LeadDetailResponse,
    LeadStatusUpdateRequest,
    LeadStatusUpdateResponse,
    LeadUpdateRequest,
    LeadUpdateResponse,
    LeadNoteRequest,
    LeadNoteResponse,
    LeadScoreResponse,
    LeadBulkRequest,
    LeadBulkResponse,
    LeadStatsResponse,
    LeadPipelineResponse,
    LeadCreateRequest,
    LeadCreateResponse,
    LeadFollowupDraftRequest,
    LeadFollowupDraftResponse,
    LeadFollowupSendRequest,
    LeadFollowupSendResponse,
    LeadAssignee,
)
from ..services.database import (
    get_admin_leads_list,
    get_admin_leads_stats,
    get_admin_leads_pipeline,
    get_admin_lead_detail,
    get_admin_lead_tags,
    get_admin_lead_assignees,
    create_admin_lead,
    update_lead_status,
    add_lead_note,
    delete_lead_note,
    calculate_lead_score,
    bulk_lead_action,
    generate_lead_followup_draft,
    send_lead_followup,
)
from ..routers.auth import get_current_user

router = APIRouter(prefix="/api/leads", tags=["leads"])


# ── Helper ───────────────────────────────────────────────────────────────────

def _tenant_id(current_user) -> str:
    return getattr(current_user, "tenant_id", None) or current_user.id


# ── Endpoints — ordered: specific routes BEFORE /{lead_id} ──────────────────

@router.get("/list", response_model=LeadListResponse)
async def list_leads_admin(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    source_page: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    """Return paginated leads with filters and stats summary."""
    data = await get_admin_leads_list(
        tenant_id=_tenant_id(current_user),
        page=page,
        per_page=per_page,
        search=search,
        status=status,
        channel=channel,
        date_from=date_from,
        date_to=date_to,
        source_page=source_page,
        tags=tags,
        assigned_to=assigned_to,
        user_id=current_user.id,
    )
    return data


@router.get("/stats", response_model=LeadStatsResponse)
async def get_leads_stats_admin(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    """Return aggregated lead stats."""
    data = await get_admin_leads_stats(
        tenant_id=_tenant_id(current_user),
        date_from=date_from,
        date_to=date_to,
        user_id=current_user.id,
    )
    return data


@router.get("/pipeline", response_model=LeadPipelineResponse)
async def get_leads_pipeline_admin(
    status: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    max_per_column: Optional[int] = Query(None, ge=1),
    current_user=Depends(get_current_user),
):
    """Return leads grouped by status for pipeline view."""
    data = await get_admin_leads_pipeline(
        tenant_id=_tenant_id(current_user),
        status_filter=status,
        channel=channel,
        search=search,
        max_per_column=max_per_column,
        user_id=current_user.id,
    )
    return data


@router.get("/tags", response_model=List[str])
async def get_lead_tags_admin(
    current_user=Depends(get_current_user),
):
    """Return a list of tags used by leads in this tenant."""
    tags = await get_admin_lead_tags(
        tenant_id=_tenant_id(current_user),
        user_id=current_user.id,
    )
    return tags


@router.get("/assignees", response_model=List[LeadAssignee])
async def get_lead_assignees_admin(
    current_user=Depends(get_current_user),
):
    """Return a list of users (assignees) for this tenant."""
    assignees = await get_admin_lead_assignees(
        tenant_id=_tenant_id(current_user),
        user_id=current_user.id,
    )
    return assignees


@router.post("/", response_model=LeadCreateResponse)
async def create_lead_admin(
    request: LeadCreateRequest,
    current_user=Depends(get_current_user),
):
    """Create a new lead manually."""
    if not (request.name or request.email or request.phone):
        raise HTTPException(status_code=400, detail="At least one of name, email, or phone is required")

    lead_id = await create_admin_lead(
        tenant_id=_tenant_id(current_user),
        name=request.name,
        email=request.email,
        phone=request.phone,
        status=request.status or "new",
        score=request.score,
        est_value=request.est_value,
        source=request.source,
        channel=request.channel,
        assigned_to=request.assigned_to,
        tags=request.tags,
        notes=request.notes,
        interest=request.interest,
        user_id=current_user.id,
    )
    if not lead_id:
        raise HTTPException(status_code=500, detail="Failed to create lead")
    return {"id": lead_id, "status": request.status or "new"}


@router.post("/{lead_id}/ai-followup", response_model=LeadFollowupDraftResponse)
async def generate_lead_ai_followup(
    lead_id: str,
    request: LeadFollowupDraftRequest,
    current_user=Depends(get_current_user),
):
    """Generate an AI draft follow-up message for a lead."""
    response = await generate_lead_followup_draft(
        lead_id=lead_id,
        channel=request.channel,
        tenant_id=_tenant_id(current_user),
        user_id=current_user.id,
    )
    return response


@router.post("/followup/send", response_model=LeadFollowupSendResponse)
async def send_lead_followup_admin(
    request: LeadFollowupSendRequest,
    current_user=Depends(get_current_user),
):
    """Send (or schedule) a follow-up message to a lead."""
    result = await send_lead_followup(
        lead_id=request.lead_id,
        channel=request.channel,
        subject=request.subject,
        content=request.content,
        is_ai_assisted=request.is_ai_assisted,
        scheduled_at=request.scheduled_at,
        tenant_id=_tenant_id(current_user),
        user_id=current_user.id,
    )
    return result


@router.post("/bulk", response_model=LeadBulkResponse)
async def bulk_leads_admin(
    request: LeadBulkRequest,
    current_user=Depends(get_current_user),
):
    """Bulk action on leads: status_change / delete / export."""
    if request.action not in ("status_change", "delete", "export"):
        raise HTTPException(status_code=400, detail="Invalid bulk action. Use: status_change, delete, export")

    if request.action == "status_change" and not request.status:
        raise HTTPException(status_code=400, detail="status is required for status_change action")

    result = await bulk_lead_action(
        lead_ids=request.lead_ids,
        tenant_id=_tenant_id(current_user),
        action=request.action,
        status=request.status,
        reason=request.reason,
        format=request.format,
        user_id=current_user.id,
    )
    return result


@router.get("/{lead_id}", response_model=LeadDetailResponse)
async def get_lead_detail_admin(
    lead_id: str,
    current_user=Depends(get_current_user),
):
    """Return full lead detail including transcript, contact, timeline, and notes."""
    data = await get_admin_lead_detail(lead_id=lead_id, tenant_id=_tenant_id(current_user), user_id=current_user.id)
    if not data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return data


@router.patch("/{lead_id}/status", response_model=LeadStatusUpdateResponse)
async def update_lead_status_admin(
    lead_id: str,
    request: LeadStatusUpdateRequest,
    current_user=Depends(get_current_user),
):
    """Update the status of a lead."""
    valid_statuses = {"new", "contacted", "qualified", "converted", "lost"}
    if request.status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {', '.join(valid_statuses)}")

    ok = await update_lead_status(
        lead_id=lead_id,
        tenant_id=_tenant_id(current_user),
        new_status=request.status,
        reason=request.reason,
        user_id=current_user.id,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Lead not found")

    from datetime import datetime
    return {"id": lead_id, "status": request.status.lower(), "updated_at": datetime.utcnow().isoformat() + "Z"}


@router.patch("/{lead_id}", response_model=LeadUpdateResponse)
async def update_lead_admin(
    lead_id: str,
    request: LeadUpdateRequest,
    current_user=Depends(get_current_user),
):
    """Update lead fields (tags, assigned_to, values, contact info)."""
    ok = await update_admin_lead(
        lead_id=lead_id,
        tenant_id=_tenant_id(current_user),
        updates=request.dict(exclude_unset=True),
        user_id=current_user.id,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Lead not found")

    from datetime import datetime
    return {"id": lead_id, "status": request.status or "", "updated_at": datetime.utcnow().isoformat() + "Z"}


@router.post("/{lead_id}/notes", response_model=LeadNoteResponse)
async def add_lead_note_admin(
    lead_id: str,
    request: LeadNoteRequest,
    current_user=Depends(get_current_user),
):
    """Add an internal note to a lead."""
    if not request.note.strip():
        raise HTTPException(status_code=400, detail="Note cannot be empty")

    ok = await add_lead_note(
        lead_id=lead_id,
        tenant_id=_tenant_id(current_user),
        note=request.note.strip(),
        user_id=current_user.id,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Lead not found")

    from datetime import datetime
    return {
        "id": lead_id,
        "note": request.note.strip(),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.delete("/{lead_id}/notes/{note_id}")
async def delete_lead_note_admin(
    lead_id: str,
    note_id: str,
    current_user=Depends(get_current_user),
):
    """Delete an internal note from a lead."""
    ok = await delete_lead_note(
        lead_id=lead_id,
        note_id=note_id,
        tenant_id=_tenant_id(current_user),
        user_id=current_user.id,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"success": True}


@router.post("/{lead_id}/score", response_model=LeadScoreResponse)
async def recalculate_lead_score_admin(
    lead_id: str,
    current_user=Depends(get_current_user),
):
    """Recalculate and persist the lead score for a lead."""
    score = await calculate_lead_score(lead_id=lead_id, tenant_id=_tenant_id(current_user), user_id=current_user.id)
    if score is None:
        raise HTTPException(status_code=404, detail="Lead not found")

    from datetime import datetime
    return {"id": lead_id, "lead_score": score, "updated_at": datetime.utcnow().isoformat() + "Z"}
