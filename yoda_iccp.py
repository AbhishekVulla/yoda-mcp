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
import events as events_mod
import onboarding as onboarding_mod
import kb_store
import requests_db

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


@mcp.tool()
def get_senior_profile(senior_id: str = "mdm-tan") -> dict:
    """Recall what Yoda already knows about this senior, from her knowledge base.

    Call this FIRST when a conversation starts, so you can greet her by her preferred
    name and avoid re-asking things already on file (her area, fall history, preferred
    day/location, interests, services she's enrolled in). Returns a concise summary —
    not the full clinical record.
    """
    p = kb_store.load_profile(senior_id)
    ident = p.get("section_a_identification", {})
    yp = p.get("yoda_profile", {})
    return {
        "preferred_name": ident.get("preferred_name") or yp.get("preferred_address"),
        "age": ident.get("age"),
        "location": ident.get("location"),
        "language_preference": yp.get("language_preference"),
        "interests": yp.get("interests", []),
        "enrolled_services": yp.get("enrolled_services", []),
        "fitness_preferences": yp.get("fitness_preferences", {}),
        "risk_flags": yp.get("risk_flags", []),
        "booked_activities": yp.get("booked_activities", []),
    }


@mcp.tool()
def get_onboarding_questions() -> list:
    """Return the short activity-onboarding questions, in order.

    Only ask the ones you do NOT already know from her profile — if her preferred day,
    location and goals are already on file, skip straight to confirming a matched class.
    """
    return onboarding_mod.QUESTIONS


@mcp.tool()
def match_events(preferences: dict) -> list:
    """Find the best 1-2 upcoming community activities for a senior.

    Pass her preferences as a dict — reuse what's already in her profile
    (goals, preferred_day, preferred_location, new_to_fitness, open_to_volunteering)
    and merge in anything she just told you. Returns events with name/location/date/time
    to offer her. Speak the top one back warmly.
    """
    matches = events_mod.match_events(preferences)
    logger.info(f"[ICCP] match_events -> {[m['name'] for m in matches]}")
    return matches


@mcp.tool()
def request_activity(event_name: str, location: str, date: str, time: str,
                     senior_id: str = "mdm-tan") -> dict:
    """Send a REQUEST to the senior's caregiver to sign her up for a community activity.

    Use this ONLY after she clearly says she is interested in a specific event you offered.
    This does NOT book anything — it creates a request for her caregiver to approve. Tell her
    warmly that you'll ask her caregiver to arrange it. Do NOT say it is booked or confirmed —
    a human makes that decision.
    """
    profile = kb_store.load_profile(senior_id)
    caregiver = (profile.get("section_p_caregiver", {})
                 .get("primary_caregiver", {}).get("name"))
    who = caregiver.split()[0] if caregiver else "your caregiver"
    event = {"name": event_name, "location": location, "date": date, "time": time}
    rid = requests_db.create_request(senior_id, event)
    logger.info(f"[ICCP] request_activity({event_name} @ {location}) -> request #{rid}")
    return {
        "status": "requested",
        "request_id": rid,
        "event": event,
        "message": (
            f"I'll ask {who} to set up {event_name} on {date}. "
            f"They'll confirm it with you soon."
        ),
    }


@mcp.tool()
def update_knowledge_base(senior_id: str = "mdm-tan", preferences: dict = None) -> dict:
    """Save preferences you learned this conversation into the senior's knowledge base.

    Merges new `preferences` into her fitness_preferences. (Bookings are NOT saved here —
    they go through the caregiver's approval of a request.)
    """
    profile = kb_store.load_profile(senior_id)
    yp = profile.setdefault("yoda_profile", {})
    if preferences:
        fp = yp.get("fitness_preferences", {})
        yp["fitness_preferences"] = kb_store.deep_merge(fp, preferences)
    kb_store.save_profile(senior_id, profile)
    logger.info(f"[ICCP] update_knowledge_base({senior_id})")
    return {"status": "saved", "senior_id": senior_id}


if __name__ == "__main__":
    mcp.run(transport="stdio")
