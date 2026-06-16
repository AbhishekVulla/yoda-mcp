# Yoda ICCP — MCP server

Gives the Yoda eldercare pendant the ability to **act** (book meals, transport,
nursing, personal care, financial-assistance lookup, escalate to a Care Corner
caseworker) by voice. Runs as a custom MCP server connected to the **hosted
xiaozhi.me** agent — the cloud DeepSeek LLM calls these tools. The ESP firmware
is untouched.

## Architecture
```
Pendant (stock firmware) → xiaozhi.me cloud (ASR + DeepSeek + TTS)
                                  │  tools/call over WSS
                                  ▼
                          mcp_pipe.py  ── stdio ──►  yoda_iccp.py (FastMCP tools)
                                                          └─► services.py (mock now → real API later)
```

## Why the tools are mocked
No Singapore provider (Care Corner / AIC / ICCP / Meals-on-Wheels / transport /
home-care) exposes a public booking API — all phone/email/referral. So every
tool returns a realistic **mock** confirmation. The single swap point is
`services.py` (the `provider_adapter` seam): when a real API exists, replace one
function body with an `httpx` call. This is the pitch's "API-first, ready as
integrations come online."

## Run
```powershell
# one-time
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt

# put the agent endpoint in .env (already gitignored):
#   MCP_ENDPOINT=wss://api.xiaozhi.me/mcp/?token=...

# run (connects to xiaozhi, then in the console: MCP Settings → Get MCP Endpoint → Refresh → Connected)
.venv\Scripts\python.exe mcp_pipe.py yoda_iccp.py
```

## Test
```powershell
.venv\Scripts\python.exe -m pytest -q
```

## Security
The `MCP_ENDPOINT` token is a secret tied to your agent. Keep it in `.env`
(gitignored), never in the deck or a public repo. Rotate via **Refresh** in the
console if it leaks.
