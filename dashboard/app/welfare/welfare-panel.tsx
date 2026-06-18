"use client";

import useSWR from "swr";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SeniorProfile, ActivityRequest } from "@/lib/db";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
type ApiResp = { profile: SeniorProfile | null; requests: ActivityRequest[]; at: number };

type Step = "idle" | "pinged" | "camera";
type LogItem = { at: number; text: string; tone: "neutral" | "accent" | "green" | "coral" };

// The necklace runs an HTTP server on the LAN; the dashboard talks to it directly.
function deviceUrl(ip: string, path: string) {
  return `http://${ip}${path}`;
}

export default function WelfarePanel() {
  // Mdm Tan's identity comes from the same Neon profile the care dashboard uses,
  // with safe fallbacks so the welfare flow works even if Neon is unreachable.
  const { data } = useSWR<ApiResp>("/api/profile", fetcher, { revalidateOnFocus: false });
  const ident = data?.profile?.section_a_identification;
  const name = ident?.preferred_name ?? "Mdm Tan";
  const address = ident?.location ?? "Blk 123 Bedok North";
  const initials = name.replace(/^Mdm\s+|^Mr\s+|^Mrs\s+/i, "").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const [ip, setIp] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [busy, setBusy] = useState<null | "ping" | "camera">(null);
  const [log, setLog] = useState<LogItem[]>([]);
  const [liveSrc, setLiveSrc] = useState("");
  const [streamFailed, setStreamFailed] = useState(false);
  const frameCounter = useRef(0);
  const [now, setNow] = useState(0);

  // load/persist the necklace's LAN IP for the demo
  useEffect(() => {
    const saved = localStorage.getItem("yoda-device-ip");
    if (saved) setIp(saved);
  }, []);
  useEffect(() => {
    if (ip) localStorage.setItem("yoda-device-ip", ip);
  }, [ip]);

  // relative-time ticker for the log
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // FALLBACK only: if the live MJPEG /stream errors, poll /capture stills (preload-swap
  // so the feed never flashes black). The stream is the primary path.
  useEffect(() => {
    if (step !== "camera" || !ip || !streamFailed) return;
    let cancelled = false;
    const tick = () => {
      const next = deviceUrl(ip, `/capture?t=${frameCounter.current++}`);
      const pre = new Image();
      pre.onload = () => { if (!cancelled) setLiveSrc(next); };
      pre.src = next;
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [step, ip, streamFailed]);

  const addLog = useCallback((text: string, tone: LogItem["tone"] = "neutral") => {
    setLog((l) => [{ at: Date.now(), text, tone }, ...l]);
  }, []);

  async function callDevice(path: string, label: string) {
    if (!ip) throw new Error("Set the necklace IP first");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      await fetch(deviceUrl(ip, path), { signal: ctrl.signal, cache: "no-store" });
    } catch (e) {
      // a CORS-opaque or network error still usually means the request reached the device;
      // surface only genuine "couldn't reach it" cases.
      throw new Error(`Couldn't reach ${name}'s necklace at ${ip} (${label})`);
    } finally {
      clearTimeout(t);
    }
  }

  async function onPing() {
    setBusy("ping");
    try {
      await callDevice("/ping", "ping");
      setStep("pinged");
      addLog(`Pinged — Yoda beeped and said "someone's at the door" out loud`, "accent");
    } catch (e) {
      addLog((e as Error).message, "coral");
    } finally {
      setBusy(null);
    }
  }

  async function onCamera() {
    setBusy("camera");
    try {
      // privacy: the announce must finish before any frame is served
      await callDevice("/camera/on", "camera");
      addLog(`Yoda announced "we're checking on you now" — camera activated`, "accent");
      setLiveSrc("");
      setStreamFailed(false);
      setStep("camera");
    } catch (e) {
      addLog((e as Error).message, "coral");
    } finally {
      setBusy(null);
    }
  }

  async function onResolve() {
    try {
      if (ip) await callDevice("/camera/off", "camera off").catch(() => {});
    } finally {
      setStep("idle");
      setLiveSrc("");
      setStreamFailed(false);
      addLog("Marked resolved — camera turned off", "green");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[840px] px-6 pb-24 pt-10 sm:px-8">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[26px] font-semibold italic tracking-tight text-ink">Yoda</span>
          <span className="text-[13px] font-medium uppercase tracking-[0.18em] text-faint">Welfare check</span>
        </div>
        <a href="/" className="text-[13px] font-medium text-muted underline-offset-4 hover:underline">← Care dashboard</a>
      </div>

      {/* senior + status */}
      <section className="rise mt-6 flex items-center gap-5 rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-[0_8px_30px_rgba(120,90,40,0.07)]">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-[22px] font-semibold text-accent ring-1 ring-accent/20">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[30px] font-semibold leading-none tracking-tight text-ink">{name}</h1>
          <p className="mt-1.5 text-[15px] text-muted">{address}</p>
        </div>
        <span className="shrink-0 rounded-full bg-coral-soft px-3 py-1.5 text-[12.5px] font-semibold text-coral">
          Delivery attempted · no response
        </span>
      </section>

      {/* device IP */}
      <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-line bg-card/70 px-4 py-3">
        <span className="text-[12.5px] font-medium text-faint">Necklace IP</span>
        <input
          value={ip}
          onChange={(e) => setIp(e.target.value.trim())}
          placeholder="192.168.1.42"
          className="w-[150px] rounded-md border border-line bg-paper px-2.5 py-1 font-mono text-[13px] text-ink outline-none focus:border-accent"
        />
        <span className={`ml-auto inline-flex items-center gap-1.5 text-[12px] font-medium ${ip ? "text-green" : "text-faint"}`}>
          <span className={`h-2 w-2 rounded-full ${ip ? "bg-green live-dot" : "bg-faint"}`} />
          {ip ? "ready" : "set the necklace's WiFi IP (shown on its serial log)"}
        </span>
      </div>

      {/* STEP 1 — ping */}
      <StepCard
        n={1}
        title="Ping Mdm Tan"
        done={step !== "idle"}
        desc="Yoda beeps and says out loud: “someone is at the door with your food. Please go to the door now.”"
        delay="120ms"
      >
        <button
          onClick={onPing}
          disabled={busy === "ping" || !ip}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_2px_12px_rgba(217,114,47,0.3)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "ping" ? "Pinging…" : step !== "idle" ? "Ping again" : "Ping Mdm Tan"}
        </button>
        {step !== "idle" && (
          <span className="text-[13px] font-medium text-green">✓ Ping sent — waiting for her to respond</span>
        )}
      </StepCard>

      {/* STEP 2 — camera */}
      <StepCard
        n={2}
        title="Request camera view"
        locked={step === "idle"}
        desc="Yoda announces “we are checking on you now”, then turns the necklace camera on so you can see she's okay."
        delay="200ms"
      >
        {step !== "camera" ? (
          <>
            <button
              onClick={onCamera}
              disabled={busy === "camera" || step === "idle" || !ip}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_2px_12px_rgba(34,29,22,0.25)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "camera" ? "Announcing…" : "Request camera view"}
            </button>
            {step === "idle" && <span className="text-[12.5px] text-faint">Unlocks after you ping her</span>}
          </>
        ) : (
          <div className="w-full">
            <div className="relative overflow-hidden rounded-[16px] border border-line bg-black/90 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {!streamFailed ? (
                // primary: live MJPEG stream (browser renders multipart natively)
                <img
                  src={deviceUrl(ip, "/stream")}
                  alt="Live view from Mdm Tan's necklace"
                  className="aspect-[4/3] w-full object-cover"
                  onError={() => setStreamFailed(true)}
                />
              ) : liveSrc ? (
                // fallback: polled stills (preload-swap, no flash)
                <img
                  src={liveSrc}
                  alt="Live view from Mdm Tan's necklace"
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[4/3] w-full place-items-center text-[13px] text-white/60">Connecting to camera…</div>
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-coral/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white live-dot" /> LIVE
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12.5px] text-muted">{streamFailed ? "Live stills (fallback)" : "Live feed"} · she was told the camera is on</span>
              <button
                onClick={onResolve}
                className="rounded-full bg-green px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(60,122,85,0.25)] transition-transform hover:scale-[1.02]"
              >
                Mark resolved
              </button>
            </div>
            <p className="mt-3 text-[12.5px] text-faint">
              After viewing, decide next steps yourself — call her, call family, or dial 995. Yoda does not escalate on its own.
            </p>
          </div>
        )}
      </StepCard>

      {/* action log */}
      <section className="rise mt-9" style={{ animationDelay: "280ms" }}>
        <h2 className="mb-3 font-display text-[20px] font-semibold tracking-tight text-ink">Session log</h2>
        {log.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-line bg-card/60 px-5 py-8 text-center font-display text-[15px] italic text-faint">
            Actions you take will be timestamped here for the record.
          </p>
        ) : (
          <ul className="space-y-2">
            {log.map((item, i) => (
              <li key={i} className="flex items-baseline gap-3 rounded-[12px] border border-line bg-card px-4 py-2.5">
                <span className="shrink-0 font-mono text-[11.5px] text-faint">{ago(now, item.at)}</span>
                <span
                  className={`text-[13.5px] ${
                    item.tone === "accent" ? "text-accent" : item.tone === "green" ? "text-green" : item.tone === "coral" ? "text-coral" : "text-muted"
                  }`}
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-center text-[12px] text-faint">
        Caregiver-initiated · the necklace announces before the camera turns on · all actions logged
      </p>
    </main>
  );
}

/* ---------- pieces ---------- */

function StepCard({
  n, title, desc, children, done, locked, delay,
}: {
  n: number; title: string; desc: string; children: React.ReactNode;
  done?: boolean; locked?: boolean; delay?: string;
}) {
  return (
    <section
      className={`rise mt-5 rounded-[var(--radius-card)] border bg-card p-6 shadow-[0_6px_22px_rgba(120,90,40,0.06)] ${
        locked ? "border-line opacity-60" : done ? "border-green/30" : "border-line"
      }`}
      style={delay ? { animationDelay: delay } : undefined}
    >
      <div className="flex items-start gap-4">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[16px] font-semibold ${
            done ? "bg-green-soft text-green" : "bg-accent-soft text-accent"
          }`}
        >
          {done ? "✓" : n}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[19px] font-semibold leading-tight text-ink">{title}</h3>
          <p className="mt-1 text-[14px] leading-snug text-muted">{desc}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function ago(now: number, at: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 3) return "now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}
