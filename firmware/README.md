# Pendant firmware

A XIAO ESP32-S3 Sense running the [xiaozhi-esp32](https://github.com/78/xiaozhi-esp32) voice
stack, plus a custom board (`yoda-pendant`) that adds the caregiver welfare check.

This folder is an **overlay, not a full firmware tree**. Upstream is ~18k files of MIT code, and
vendoring it here would bury the part that is actually ours. So this holds only our files, applied
onto a clean upstream checkout.

## What's ours

| Path | What it is |
|------|------------|
| `yoda-pendant/config.h` | Pin map: I2S speaker (MAX98357A), PDM mic, camera, boot button, cloud relay config |
| `yoda-pendant/config.json` | Build target and sdkconfig (8 MB flash, EN_US, "Jarvis" wake word) |
| `yoda-pendant/yoda_pendant_board.cc` | The board: voice stack, LAN HTTP server, and the cloud relay loop |
| `assets/checking.ogg` | "We're checking on you now" privacy announce, played before the camera arms |
| `assets/door.ogg` | Legacy ping announce |
| `patches/esp32_camera.{h,cc}.patch` | Adds `CaptureToJpeg` and a lean `CaptureJpegStream` for MJPEG |
| `patches/CMakeLists.txt.patch` | Registers `BOARD_TYPE_YODA_PENDANT` |
| `patches/Kconfig.projbuild.patch` | Adds the board to the menuconfig list |
| `scripts/` | Build, flash and serial helpers (Windows) |

## Hardware

XIAO ESP32-S3 Sense: onboard camera (OV2640 or OV3660 depending on the batch, same Seeed pinout),
onboard PDM mic, 2.4 GHz WiFi, USB-CDC.

**MAX98357A I2S amp.** Note the silk labels on the XIAO are not GPIO numbers:

| Amp pin | XIAO pad | GPIO |
|---------|----------|------|
| BCLK | D8 | 7 |
| LRC / WS | D9 | 8 |
| DIN | D10 | 9 |
| VIN | 5V | |
| GND | GND | |

PDM mic is on GPIO 42 (clock) and 41 (data). Wake word is "Jarvis", the stock WakeNet
`wn9_jarvis_tts` model. "Yoda" would need Espressif's paid custom training.

## Two ways the caregiver reaches the necklace

**Cloud relay (the one that matters).** The necklace polls the deployed dashboard for pending
commands and pushes JPEG frames back up, both outbound over HTTPS. No port forwarding, no LAN
discovery, no public IP. It works on a mobile hotspot. Configured by `YODA_CLOUD_BASE` /
`YODA_DEVICE_TOKEN` in `config.h`, hitting `/api/device/poll` and `/api/device/frame`.

The idle poll is deliberately slow (15 s). A faster poll means a fresh TLS handshake every cycle,
which starves the on-chip wake-word detector of CPU and stops "Jarvis" triggering at all. That bug
cost a while to find, so the interval is load-bearing, not arbitrary.

**LAN HTTP server (fallback).** Kept for same-WiFi debugging.

| Endpoint | Effect |
|----------|--------|
| `GET /ping` | Beep and announce, asking her to respond |
| `GET /camera/on` | Privacy announce, then arm the camera |
| `GET /capture` | One JPEG still, only when armed |
| `GET /stream` | Live MJPEG until the client disconnects |
| `GET /camera/off` | Disarm, stream loop exits |

Camera frames are gated behind `/camera/on` by design. The caregiver cannot see anything until the
necklace has said out loud that it is turning on.

## Build from scratch

Needs ESP-IDF v5.5.x (built against 5.5.2).

```powershell
git clone https://github.com/78/xiaozhi-esp32.git
cd xiaozhi-esp32
powershell -File ..\yoda-mcp\firmware\apply-overlay.ps1 -XiaozhiRoot .
python scripts\release.py yoda-pendant
```

The wake word and 8 MB flash config come from `config.json`'s `sdkconfig_append`, so a clean build
is already set to Jarvis with no manual menuconfig.

```powershell
idf.py -p COM5 flash        # COM5 is single-access, close any serial monitor first
pio device monitor -p COM5 -b 115200
```

On boot the log prints the device's LAN IP for the fallback path:
`=== JARVIS WELFARE: device IP = 10.x.x.x ===`

> The `scripts/*.bat` helpers hard-code local paths (ESP-IDF under `C:\Users\...`). They are
> committed as a record of how this machine builds. Edit the paths for another environment, or use
> the raw `idf.py` commands above.
