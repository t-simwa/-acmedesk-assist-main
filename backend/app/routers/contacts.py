"""
Contacts CRUD API endpoints (9.8).

Implements:
- GET    /api/contacts           - List contacts with pagination/search
- POST   /api/contacts           - Create a new contact
- GET    /api/contacts/{id}      - Get contact detail
- PUT    /api/contacts/{id}      - Update a contact
- DELETE /api/contacts/{id}      - Delete a contact
"""

import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_

from ..models.base import get_session_factory
from ..models.contact import Contact
from ..models.conversation import Conversation
from ..models.booking import Booking
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.contacts import (
    ContactCreateRequest,
    ContactDetailResponse,
    ContactItem,
    ContactListResponse,
    ContactUpdateRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/contacts", tags=["contacts"])


def _contact_to_item(c: Contact) -> ContactItem:
    d = c.to_dict()
    return ContactItem(**d)


@router.get("", response_model=ContactListResponse)
async def list_contacts(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> ContactListResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = select(Contact).where(Contact.tenant_id == current_user.tenant_id)
        count_query = select(func.count(Contact.id)).where(Contact.tenant_id == current_user.tenant_id)

        if search:
            pattern = f"%{search}%"
            search_filter = or_(
                Contact.full_name.ilike(pattern),
                Contact.email.ilike(pattern),
                Contact.phone.ilike(pattern),
                Contact.company.ilike(pattern),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if lead_status:
            query = query.where(Contact.lead_status == lead_status)
            count_query = count_query.where(Contact.lead_status == lead_status)

        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0

        offset = (page - 1) * per_page
        query = query.order_by(Contact.updated_at.desc()).offset(offset).limit(per_page)
        result = await session.execute(query)
        contacts = result.scalars().all()

        return ContactListResponse(
            contacts=[_contact_to_item(c) for c in contacts],
            total=total, page=page, per_page=per_page,
        )


@router.post("", response_model=ContactItem, status_code=status.HTTP_201_CREATED)
async def create_contact(
    request: ContactCreateRequest,
    current_user: User = Depends(get_current_user),
) -> ContactItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        now = datetime.utcnow()
        contact = Contact(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            full_name=request.full_name,
            email=request.email,
            phone=request.phone,
            instagram_handle=request.instagram_handle,
            company=request.company,
            lead_status=request.lead_status or "new",
            lead_score=request.lead_score,
            tags=request.tags,
            notes=request.notes,
            first_seen_at=now,
            last_active_at=now,
            created_at=now,
            updated_at=now,
        )
        session.add(contact)
        await session.commit()
        await session.refresh(contact)
        return _contact_to_item(contact)


@router.get("/{contact_id}", response_model=ContactDetailResponse)
async def get_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
) -> ContactDetailResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Contact).where(
                Contact.id == contact_id,
                Contact.tenant_id == current_user.tenant_id,
            )
        )
        contact = result.scalar_one_or_none()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        conv_count_result = await session.execute(
            select(func.count(Conversation.id)).where(Conversation.contact_id == contact_id)
        )
        conversations_count = conv_count_result.scalar() or 0

        booking_count_result = await session.execute(
            select(func.count(Booking.id)).where(Booking.contact_id == contact_id)
        )
        bookings_count = booking_count_result.scalar() or 0

        return ContactDetailResponse(
            contact=_contact_to_item(contact),
            conversations_count=conversations_count,
            bookings_count=bookings_count,
        )


@router.put("/{contact_id}", response_model=ContactItem)
async def update_contact(
    contact_id: str,
    request: ContactUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> ContactItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Contact).where(
                Contact.id == contact_id,
                Contact.tenant_id == current_user.tenant_id,
            )
        )
        contact = result.scalar_one_or_none()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        update_data = request.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(contact, key, value)
        contact.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(contact)
        return _contact_to_item(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Contact).where(
                Contact.id == contact_id,
                Contact.tenant_id == current_user.tenant_id,
            )
        )
        contact = result.scalar_one_or_none()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        await session.delete(contact)
        await session.commit()
