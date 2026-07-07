# Jarvis pendant case — XIAO ESP32-S3 Sense

Parametric 3D-printed enclosure. With the speaker/amp gone, it hugs just the board + camera stack, so it's ~half the old project box. Model it once, tweak numbers, reprint.

## Files
- `pendant_case.py` — the build123d model (all dims are parameters at the top)
- `pendant_base.stl` / `.step` — the tub
- `pendant_lid.stl` / `.step` — the front lid
- `viewer.html` — interactive browser preview
- `preview.png` — static render

## Regenerate after editing parameters
```
cd yoda-mcp
cad/.venv/Scripts/python.exe cad/pendant_case.py
```

## Preview in the browser
```
cd yoda-mcp/cad
.venv/Scripts/python.exe -m http.server 8000
# open http://localhost:8000/viewer.html   (drag = rotate, "toggle lid" to see inside)
```

## Print settings
- PLA, 0.2 mm layers, 3 walls, ~15% infill
- **No supports.** Print the lid flat-face-down; print the tub open-side-up.
- 2× M2 self-tapping screws (~6–8 mm) hold the lid.

## Dimensions (v1, from the datasheet — expect to tune)
- Board stack assumed **21 × 17.8 × 15 mm**, +0.8 mm clearance/side, 2 mm walls.
- Body envelope **23.4 × 19.8 × 26.6 mm** (+ lanyard loop on top).
- Camera hole 9 mm (centered), mic 1.8 mm beside it, USB-C slot 9.5 × 4.5 mm (bottom), lanyard 4 mm hole (top).

## Tuning after a test print — edit the param, re-run
| What's wrong | Change |
|---|---|
| Board won't drop in / rattles | `CLR` |
| Camera hole not aligned | `CAM_OFF_X` (+right) / `CAM_OFF_Z` (+up) |
| Mic hole not aligned | `MIC_OFF_X` / `MIC_OFF_Z` |
| USB-C won't plug / off-center | `USB_OFF_X` / `USB_OFF_Y` / `USB_W` / `USB_H` |
| Screws too tight/loose | `SCREW_CLEAR` (lid) / `SCREW_PILOT` (boss) |

## Known v1 simplifications (refine once the fit is confirmed)
- No dedicated board-retention ledge — the closed lid holds the board. Add standoffs if it rattles.
- No explicit antenna channel — the cavity has slack to tuck the flat u.FL antenna against a wall.
