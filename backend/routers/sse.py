"""SSE (Server-Sent Events) manager and /api/sse endpoint.

Every connected browser client receives push messages when the background
scheduler finishes a price update.  The frontend uses these messages to
trigger SWR revalidation, so the UI refreshes automatically without polling.

Usage from background threads (e.g. scheduler):
    from .routers.sse import manager
    manager.broadcast_from_thread('{"type":"prices_updated"}')
"""

import asyncio
import logging
from typing import AsyncGenerator, Set

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter()


class SSEManager:
    """Thread-safe manager for active SSE connections.

    FastAPI runs on an asyncio event loop.  The APScheduler jobs run in
    separate threads.  ``broadcast_from_thread`` bridges the two worlds
    using ``asyncio.run_coroutine_threadsafe``.
    """

    def __init__(self) -> None:
        self._queues: Set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Called once at app startup to capture the running event loop."""
        self._loop = loop

    async def _broadcast(self, message: str) -> None:
        for queue in self._queues.copy():
            await queue.put(message)

    def broadcast_from_thread(self, message: str) -> None:
        """Schedule a broadcast from any background thread."""
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self._broadcast(message), self._loop)
        else:
            logger.warning("SSE broadcast skipped: event loop not available")

    async def _event_stream(self) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue = asyncio.Queue()
        self._queues.add(queue)
        logger.info(f"SSE client connected ({len(self._queues)} total)")
        try:
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {message}\n\n"
                except asyncio.TimeoutError:
                    # Keepalive comment keeps proxies from closing idle connections.
                    yield ": keepalive\n\n"
        finally:
            self._queues.discard(queue)
            logger.info(f"SSE client disconnected ({len(self._queues)} remaining)")


# Module-level singleton shared between the router and the scheduler
manager = SSEManager()


@router.get("/sse")
async def sse_endpoint():
    """SSE endpoint at /api/sse.

    Clients connect and receive push messages whenever prices are refreshed.
    The browser EventSource API handles reconnection automatically.
    """
    return StreamingResponse(
        manager._event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable Nginx response buffering
        },
    )
