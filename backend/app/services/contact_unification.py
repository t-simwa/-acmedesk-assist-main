from __future__ import annotations

from typing import Tuple, Optional
from sqlalchemy import select, update
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.contact import Contact
from ..models.contact_event import ContactEvent
from ..models.conversation import Conversation
from ..models.lead import Lead


def _log_contact_event(db: AsyncSession, contact_id: str, event_type: str, details: dict = None) -> None:
    ev = ContactEvent(
        id=str(uuid.uuid4()),
        contact_id=contact_id,
        event_type=event_type,
        details=details or {},
    )
    db.add(ev)


async def resolve_or_create_contact(
    tenant_id: str, event, db: AsyncSession
) -> Tuple[Contact, bool]:
    """
    Returns (contact, is_returning_cross_channel)
    """
    # Priority 1: exact channel match
    stmt = select(Contact).where(
        Contact.tenant_id == tenant_id,
        Contact.channel_identifiers.contains({event.channel: event.channel_user_id})
    )
    result = await db.execute(stmt)
    contact = result.scalar_one_or_none()
    if contact:
        updated = False
        if event.contact_name and not contact.full_name:
            contact.full_name = event.contact_name
            updated = True
        if event.contact_avatar_url and not contact.avatar_url:
            contact.avatar_url = event.contact_avatar_url
            updated = True
        if updated:
            await db.commit()
        return contact, False

    # Priority 2: phone match
    if event.contact_phone:
        stmt = select(Contact).where(
            Contact.tenant_id == tenant_id,
            Contact.phone == event.contact_phone
        )
        result = await db.execute(stmt)
        contact = result.scalar_one_or_none()
        if contact:
            cid = contact.channel_identifiers or {}
            cid[event.channel] = event.channel_user_id
            contact.channel_identifiers = cid
            await db.commit()
            _log_contact_event(db, contact.id, "unification", {"reason": "phone"})
            return contact, True

    # Priority 3: email match
    if event.contact_email:
        stmt = select(Contact).where(
            Contact.tenant_id == tenant_id,
            Contact.email == event.contact_email
        )
        result = await db.execute(stmt)
        contact = result.scalar_one_or_none()
        if contact:
            cid = contact.channel_identifiers or {}
            cid[event.channel] = event.channel_user_id
            contact.channel_identifiers = cid
            if event.contact_phone and not contact.phone:
                contact.phone = event.contact_phone
            await db.commit()
            _log_contact_event(db, contact.id, "unification", {"reason": "email"})
            return contact, True

    # No match: create new
    new_contact = Contact(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        full_name=event.contact_name,
        phone=event.contact_phone,
        email=event.contact_email,
        channel_identifiers={event.channel: event.channel_user_id},
        first_seen_channel=event.channel,
    )
    db.add(new_contact)
    await db.commit()
    return new_contact, False


async def manually_merge_contacts(
    primary_id: str, secondary_id: str, user, db: AsyncSession
):
    # fetch both
    stmt = select(Contact).where(Contact.id.in_([primary_id, secondary_id]))
    res = await db.execute(stmt)
    contacts = res.scalars().all()
    if len(contacts) != 2:
        raise ValueError("Contacts not found or mismatch tenant")
    primary = next(c for c in contacts if c.id == primary_id)
    secondary = next(c for c in contacts if c.id == secondary_id)
    if primary.tenant_id != secondary.tenant_id:
        raise ValueError("Cannot merge contacts from different tenants")

    # merge identifiers
    cid = primary.channel_identifiers or {}
    for k, v in (secondary.channel_identifiers or {}).items():
        if k not in cid:
            cid[k] = v
    primary.channel_identifiers = cid

    # fill None fields
    for field in ["full_name", "email", "phone"]:
        if not getattr(primary, field) and getattr(secondary, field):
            setattr(primary, field, getattr(secondary, field))

    # merge tags, notes
    p_tags = set(primary.tags or [])
    s_tags = set(secondary.tags or [])
    primary.tags = list(p_tags.union(s_tags))
    if secondary.notes:
        primary.notes = (primary.notes or "") + "\n" + secondary.notes

    # update conversations and leads
    await db.execute(
        update(Conversation)
        .where(Conversation.contact_id == secondary.id)
        .values(contact_id=primary.id)
    )
    await db.execute(
        update(Lead)
        .where(Lead.contact_id == secondary.id)
        .values(contact_id=primary.id)
    )

    # delete secondary
    await db.delete(secondary)
    await db.commit()

    _log_contact_event(db, primary.id, "manual_merge", {"secondary_id": secondary_id, "merged_by": user.id})
    return primary


async def send_returning_customer_greeting(
    contact: Contact,
    channel: str,
    conversation,
    send_fn,
    db: AsyncSession,
) -> None:
    # check if already greeted
    stmt = select(ContactEvent).where(
        ContactEvent.contact_id == contact.id,
        ContactEvent.event_type == "cross_channel_greeting",
        ContactEvent.details["channel"].as_string() == channel,
    )
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        return
    first_name = contact.full_name.split()[0] if contact.full_name else None
    greeting = f"Hey {first_name}! 👋 " if first_name else "Hey! 👋 "
    greeting += "Looks like you've reached out to us before — welcome back!"
    if channel != "email":
        await send_fn(greeting)
    _log_contact_event(db, contact.id, "cross_channel_greeting", {"channel": channel})


async def check_opt_out(
    phone: Optional[str],
    channel: str,
    tenant_id: str,
    db: AsyncSession
) -> bool:
    if not phone:
        return False
    stmt = select(Contact).where(
        Contact.tenant_id == tenant_id,
        Contact.phone == phone,
    )
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if not contact:
        return False
    if contact.opted_out:
        return True
    if channel in (contact.opted_out_channels or []):
        return True
    return False


async def handle_opt_out(
    phone: str, channel: str, tenant_id: str, db: AsyncSession
) -> None:
    stmt = select(Contact).where(
        Contact.tenant_id == tenant_id,
        Contact.phone == phone,
    )
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if contact:
        if channel == "sms":
            contact.opted_out = True
            contact.opted_out_channels = (contact.opted_out_channels or []) + ["sms"]
        await db.commit()
