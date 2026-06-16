"""
Yoda ICCP MCP server.

Exposes community-care "tools" to the xiaozhi.me hosted LLM (DeepSeek). When a
senior talks to the Yoda pendant, the cloud LLM calls the relevant tool here.

Run it (connected to xiaozhi) via the pipe:
    python mcp_pipe.py yoda_iccp.py

SMOKE-TEST STAGE: one real tool (book_meal_delivery) to prove the loop end-to-end
before the full 6-tool set is wired in.
"""

from fastmcp import FastMCP
import sys
import logging

import services

# Windows console UTF-8 (xiaozhi pipes via stdio)
if sys.platform == "win32":
    sys.stderr.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yoda-iccp")

mcp = FastMCP("yoda-iccp")


@mcp.tool()
def book_meal_delivery(date: str, meal_type: str = "lunch") -> dict:
    """Book a hot meal delivery for an elderly person living at home.

    Use this when the senior asks for food or meals to be delivered, says they
    cannot cook, or has no one to prepare food for them. After calling it, speak
    the confirmation back to them warmly in their own language.

    Args:
        date: when the meal is needed, e.g. "tomorrow" or "2026-06-11".
        meal_type: "breakfast", "lunch", or "dinner". Defaults to "lunch".
    """
    result = services.book_meal(date=date, meal_type=meal_type)
    logger.info(f"[ICCP] book_meal_delivery({date}, {meal_type}) -> {result['reference']}")
    return result


if __name__ == "__main__":
    mcp.run(transport="stdio")
