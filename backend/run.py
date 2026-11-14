"""
2ndGM AI Chess Lab — Programmatic Uvicorn Launcher
====================================================
Use this file instead of calling uvicorn directly on Windows.
It enforces WindowsProactorEventLoopPolicy *before* uvicorn creates
its event loop, which is the only point in time where the policy
switch actually takes effect for async subprocess support (Stockfish).

Usage:
    python run.py
    python run.py --prod        # disables reload, sets workers=1

The policy guard is a no-op on Linux / macOS (sys.platform != 'win32').
"""

import sys
import asyncio

# ── MUST be set before uvicorn is imported / run ─────────────────────────────
# uvicorn creates its SelectorEventLoop during uvicorn.run(); setting the
# policy here guarantees the ProactorEventLoop is used from the start,
# enabling asyncio subprocess support required by python-chess popen_uci.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import argparse
import uvicorn

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="2ndGM backend launcher")
    parser.add_argument("--prod", action="store_true", help="Run in production mode (no reload)")
    args = parser.parse_args()

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=not args.prod,   # reload=True in dev, False in prod
        log_level="info",
    )
