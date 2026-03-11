from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from ..routers.auth import get_current_user
from ..models.user import User
from ..services import test_stream as ts
import json

router = APIRouter(prefix="/api/channels", tags=["test-stream"])


async def _sse_generator(tenant_id: str, channel: str):
    async for payload in ts.subscribe(tenant_id, channel):
        if payload is None:
            # keep-alive comment
            yield ":keep-alive\n\n"
            continue
        data = json.dumps(payload)
        yield f"data: {data}\n\n"


@router.get("/{channel}/test-stream")
async def channel_test_stream(channel: str, current_user: User = Depends(get_current_user)):
    """Server-Sent Events endpoint returning test events for a tenant+channel."""
    tenant_id = current_user.tenant_id
    generator = _sse_generator(tenant_id, channel)
    return StreamingResponse(generator, media_type="text/event-stream")
