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

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from ..schemas.leads import (
    LeadListResponse,
    LeadDetailResponse,
    LeadStatusUpdateRequest,
    LeadStatusUpdateResponse,
    LeadNoteRequest,
    LeadNoteResponse,
    LeadScoreResponse,
    LeadBulkRequest,
    LeadBulkResponse,
)
from ..services.database import (
    get_admin_leads_list,
    get_admin_lead_detail,
    update_lead_status,
    add_lead_note,
    calculate_lead_score,
    bulk_lead_action,
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
        user_id=current_user.id,
    )
    return data


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
