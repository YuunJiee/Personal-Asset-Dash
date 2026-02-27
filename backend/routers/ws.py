"""WebSocket connection manager and /api/ws endpoint.

Every connected browser client receives push messages when the background
scheduler finishes a price update.  The frontend uses these messages to
trigger SWR revalidation, so the UI refreshes automatically without polling.

Usage from background threads (e.g. scheduler):
    from .routers.ws import manager
    manager.broadcast_from_thread('{"type":"prices_updated"}')
"""

import asyncio
import json
import logging
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Thread-safe manager for active WebSocket connections.

    FastAPI runs on an asyncio event loop.  The APScheduler jobs run in
    separate threads.  ``broadcast_from_thread`` bridges the two worlds
    using ``asyncio.run_coroutine_threadsafe``.
    """

    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Called once at app startup to capture the running event loop."""
        self._loop = loop

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        logger.info(f"WS client connected ({len(self._connections)} total)")

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        logger.info(f"WS client disconnected ({len(self._connections)} remaining)")

    async def _broadcast(self, message: str) -> None:
        """Send *message* to all connected clients, pruning dead sockets."""
        dead: Set[WebSocket] = set()
        for ws in self._connections.copy():
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        self._connections -= dead

    def broadcast_from_thread(self, message: str) -> None:
        """Schedule a broadcast from any background thread.

        Safe to call when the asyncio event loop is running in another thread
        (which is always the case with Uvicorn + BackgroundScheduler).
        """
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self._broadcast(message), self._loop)
        else:
            logger.warning("WS broadcast skipped: event loop not available")


# Module-level singleton shared between the router and the scheduler
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint at /api/ws.

    Clients connect and receive push messages whenever prices are refreshed.
    The server never waits for messages from the client; the connection is
    kept alive until the client disconnects.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection open.  We don't process inbound messages,
            # but we must await *something* so the event loop can deliver
            # outbound sends.  receive_text() raises WebSocketDisconnect
            # when the client closes the connection.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
