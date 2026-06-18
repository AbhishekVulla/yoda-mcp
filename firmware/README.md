# Yoda Pendant — Firmware

Firmware for the **Yoda** eldercare necklace: a XIAO ESP32-S3 Sense running the
[xiaozhi-esp32](https://github.com/78/xiaozhi-esp32) voice stack, plus a small custom
board (`yoda-pendant`) that adds the **caregiver welfare-check** features (Feature 2).

This folder is an **overlay**, not a full firmware tree. xiaozhi-esp32 is ~18k files of
upstream (MIT) code — vendoring it here would bury our actual contribution. Instead we keep
**only the files that are ours** and apply them onto a clean upstream checkout.

## What's ours (everything in this folder)

| Path | What it is |
|------|------------|
| `yoda-pendant/config.h` | Pin map: I2S speaker (MAX98357A), PDM mic, OV2640 camera, boot button |
| `yoda-pendant/config.json` | Build target + sdkconfig (8MB flash, EN_US, **Jarvis** wake word) |
| `yoda-pendant/yoda_pendant_board.cc` | The board: voice stack + LAN HTTP server (`/ping`, `/camera/on`, `/capture`, `/stream` MJPEG, `/camera/off`) |
| `assets/door.ogg` | "Someone's at the door" announce (played on `/ping`) |
| `assets/checking.ogg` | "We're checking on you now" privacy announce (played on `/camera/on`) |
| `patches/esp32_camera.{h,cc}.patch` | Adds `CaptureToJpeg` + lean `CaptureJpegStream` (single-grab `frame2jpg`) for the MJPEG stream |
| `patches/CMakeLists.txt.patch` | Registers `BOARD_TYPE_YODA_PENDANT` |
| `patches/Kconfig.projbuild.patch` | Adds the board to the menuconfig board list |
| `scripts/` | Build / flash / serial helpers (Windows) |

## Hardware

- **XIAO ESP32-S3 Sense** — OV2640 camera, onboard PDM mic, WiFi 2.4 GHz, USB-CDC (COM5)
- **MAX98357A** I2S amp → 8 Ω speaker (speaker on `GPIO1/2/3`, PDM mic on `GPIO42/41`)
- Wake word: **"Jarvis"** (stock WakeNet `wn9_jarvis_tts`; "Yoda" needs Espressif's paid custom service)

## Build from scratch

Prereqs: **ESP-IDF v5.5.x** installed (this project was built against 5.5.2).

```powershell
# 1. Clone the upstream firmware next to this repo
git clone https://github.com/78/xiaozhi-esp32.git
cd xiaozhi-esp32

# 2. Apply our overlay (run from the xiaozhi-esp32 root; point -RepoFirmware at this folder)
powershell -File ..\yoda-mcp\firmware\apply-overlay.ps1 -XiaozhiRoot .

# 3. Build (release.py selects the yoda-pendant board + its sdkconfig)
python scripts\release.py yoda-pendant
```

The wake word and 8MB-flash config come from `config.json`'s `sdkconfig_append`, so a clean
build is **already** set to Jarvis — no manual menuconfig needed.

### Flash & monitor (XIAO on COM5)

```powershell
idf.py -p COM5 flash         # COM5 is single-access — close any serial monitor first
python firmware\scripts\read_serial.py   # or: pio device monitor -p COM5 -b 115200
```

On boot the serial log prints the device's LAN IP:
`=== YODA WELFARE: device IP = 10.x.x.x (enter this in the dashboard) ===` — paste that IP
into the dashboard's `/welfare` page.

> The `scripts/*.bat` helpers hard-code local paths (ESP-IDF at `C:\Users\Abhis\esp\esp-idf`,
> repo under `Downloads\Yoda`). They're committed as a record of how this machine builds —
> edit the paths for another environment, or just use the raw `idf.py` commands above.

## Welfare HTTP API (served by the necklace over the LAN)

| Endpoint | Effect |
|----------|--------|
| `GET /ping` | Beep + "someone's at the door" announce |
| `GET /camera/on` | Privacy announce ("checking on you now"), then **arm** the camera |
| `GET /capture` | One JPEG still (only when armed) |
| `GET /stream` | Live **MJPEG** (`multipart/x-mixed-replace`) until the client disconnects |
| `GET /camera/off` | Disarm; the stream loop exits |

Camera frames are gated behind `/camera/on` (the privacy announce) by design — the caregiver
cannot see anything until the senior has been told.
