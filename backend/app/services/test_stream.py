import asyncio
import json
import logging
from typing import Dict, List, Tuple, Any

logger = logging.getLogger(__name__)

# In-memory subscriber registry: keys are (tenant_id, channel)
_subscribers: Dict[Tuple[str, str], List[asyncio.Queue]] = {}


def _key(tenant_id: str, channel: str) -> Tuple[str, str]:
    return tenant_id, channel


def publish_event(tenant_id: str, channel: str, payload: Any) -> None:
    """Publish an event to all subscribers for the tenant+channel."""
    key = _key(tenant_id, channel)
    queues = _subscribers.get(key, [])
    if not queues:
        return
    for q in list(queues):
        try:
            q.put_nowait(payload)
        except Exception:
            logger.exception("Failed to publish event to subscriber")


async def subscribe(tenant_id: str, channel: str):
    """Async generator that yields events for the tenant+channel.

    Yields incoming payloads as JSON-serializable objects. This generator
    will keep the connection open and send keep-alive comments when idle.
    """
    key = _key(tenant_id, channel)
    q: asyncio.Queue = asyncio.Queue()
    _subscribers.setdefault(key, []).append(q)
    try:
        while True:
            try:
                payload = await asyncio.wait_for(q.get(), timeout=30.0)
                yield payload
            except asyncio.TimeoutError:
                # yield a keep-alive ping (empty comment) periodically
                yield None
    finally:
        # remove queue from subscribers
        lst = _subscribers.get(key)
        if lst and q in lst:
            lst.remove(q)
        if not lst:
            _subscribers.pop(key, None)
