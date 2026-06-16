"""Knowledge-base storage adapter.

The senior's profile is a JSON file (Abel's interRAI baseline + Yoda's appended
preferences/bookings) — ONE shared shape. `load_profile` reads it, `save_profile`
writes it. Backend is local file by default (bulletproof for a live demo); flip to
Supabase Storage with `KB_BACKEND=supabase` once a project exists (the seam is below).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

KB_BACKEND = os.getenv("KB_BACKEND", "local").lower()
_DATA_DIR = Path(__file__).parent / "data" / "profiles"


def _local_path(senior_id: str) -> Path:
    return _DATA_DIR / f"{senior_id}.json"


def load_profile(senior_id: str = "mdm-tan") -> dict:
    """Read the senior's knowledge-base profile. Returns a fresh skeleton if none exists."""
    if KB_BACKEND == "supabase":
        return _supabase_load(senior_id)
    path = _local_path(senior_id)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"senior_id": senior_id,
            "yoda_profile": {"booked_activities": [], "caregiver_alerts": []}}


def save_profile(senior_id: str, profile: dict) -> dict:
    """Persist the full profile dict. Returns it."""
    if KB_BACKEND == "supabase":
        return _supabase_save(senior_id, profile)
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _local_path(senior_id).write_text(
        json.dumps(profile, indent=2, ensure_ascii=False), encoding="utf-8")
    return profile


def deep_merge(base: dict, updates: dict) -> dict:
    """Recursively merge `updates` into `base` (nested dicts merge; scalars/lists replace)."""
    out = dict(base)
    for k, v in (updates or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


# --- Supabase seam (documented; fill when a `senior-profiles` bucket exists) -------------
def _supabase_load(senior_id: str) -> dict:  # pragma: no cover
    raise NotImplementedError(
        "KB_BACKEND=supabase not wired yet. Use the local default for the demo, or "
        "implement download from the `senior-profiles` bucket here.")


def _supabase_save(senior_id: str, profile: dict) -> dict:  # pragma: no cover
    raise NotImplementedError(
        "KB_BACKEND=supabase not wired yet. Use the local default for the demo, or "
        "implement upload to the `senior-profiles` bucket here.")
