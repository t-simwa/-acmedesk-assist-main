"""Services catalog API endpoints."""

import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from ..models.base import get_session_factory
from ..models.service import Service
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.bookings import (
    ServiceCreateRequest,
    ServiceItem,
)

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("", response_model=List[ServiceItem])
async def list_services(current_user: User = Depends(get_current_user)):
    session_factory = get_session_factory()
    async with session_factory() as session:
        query = select(Service).where(Service.tenant_id == current_user.tenant_id)
        result = await session.execute(query)
        services = result.scalars().all()
        return [
            ServiceItem(
                id=s.id,
                tenant_id=s.tenant_id,
                name=s.name,
                description=s.description,
                duration_minutes=s.duration_minutes,
                default_price=float(s.default_price) if s.default_price is not None else None,
                currency=s.currency,
                created_at=s.created_at.isoformat() + "Z" if s.created_at else None,
                updated_at=s.updated_at.isoformat() + "Z" if s.updated_at else None,
            )
            for s in services
        ]


@router.post("", response_model=ServiceItem, status_code=status.HTTP_201_CREATED)
async def create_service(
    request: ServiceCreateRequest,
    current_user: User = Depends(get_current_user),
) -> ServiceItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        now = datetime.utcnow()
        service = Service(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            name=request.name,
            description=request.description,
            duration_minutes=request.duration_minutes,
            default_price=request.default_price,
            currency=request.currency or "KES",
            created_at=now,
            updated_at=now,
        )
        session.add(service)
        await session.commit()
        await session.refresh(service)
        return ServiceItem(
            id=service.id,
            tenant_id=service.tenant_id,
            name=service.name,
            description=service.description,
            duration_minutes=service.duration_minutes,
            default_price=float(service.default_price) if service.default_price is not None else None,
            currency=service.currency,
            created_at=service.created_at.isoformat() + "Z" if service.created_at else None,
            updated_at=service.updated_at.isoformat() + "Z" if service.updated_at else None,
        )


@router.get("/{service_id}", response_model=ServiceItem)
async def get_service(service_id: str, current_user: User = Depends(get_current_user)) -> ServiceItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Service).where(
                Service.id == service_id,
                Service.tenant_id == current_user.tenant_id,
            )
        )
        service = result.scalar_one_or_none()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        return ServiceItem(
            id=service.id,
            tenant_id=service.tenant_id,
            name=service.name,
            description=service.description,
            duration_minutes=service.duration_minutes,
            default_price=float(service.default_price) if service.default_price is not None else None,
            currency=service.currency,
            created_at=service.created_at.isoformat() + "Z" if service.created_at else None,
            updated_at=service.updated_at.isoformat() + "Z" if service.updated_at else None,
        )


@router.put("/{service_id}", response_model=ServiceItem)
async def update_service(
    service_id: str,
    request: ServiceCreateRequest,
    current_user: User = Depends(get_current_user),
) -> ServiceItem:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Service).where(
                Service.id == service_id,
                Service.tenant_id == current_user.tenant_id,
            )
        )
        service = result.scalar_one_or_none()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

        service.name = request.name
        service.description = request.description
        service.duration_minutes = request.duration_minutes
        service.default_price = request.default_price
        service.currency = request.currency or service.currency

        await session.commit()
        await session.refresh(service)
        return ServiceItem(
            id=service.id,
            tenant_id=service.tenant_id,
            name=service.name,
            description=service.description,
            duration_minutes=service.duration_minutes,
            default_price=float(service.default_price) if service.default_price is not None else None,
            currency=service.currency,
            created_at=service.created_at.isoformat() + "Z" if service.created_at else None,
            updated_at=service.updated_at.isoformat() + "Z" if service.updated_at else None,
        )


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Service).where(
                Service.id == service_id,
                Service.tenant_id == current_user.tenant_id,
            )
        )
        service = result.scalar_one_or_none()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        await session.delete(service)
        await session.commit()
