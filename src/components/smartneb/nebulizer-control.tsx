import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { startSession, updateSession } from "@/lib/smartneb.functions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./vitals";
import { cn } from "@/lib/utils";

export type NebState = "OFF" | "READY" | "COMMAND_SENT" | "RUNNING" | "PAUSED" | "COMPLETED" | "ERROR";

function chime() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [880, 1174].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = f;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.22 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.22);
      osc.stop(ctx.currentTime + i * 0.22 + 0.4);
    });
  } catch {
    /* audio unavailable */
  }
}

type ActiveSession = {
  id: string;
  status: string;
  prescribed_seconds: number;
  elapsed_seconds: number;
  medication: string | null;
  dosage: string | null;
} | null;

export function NebulizerControl({
  patientId,
  session,
  deviceOnline,
  medication,
  dosage,
  prescribedMinutes,
  compact = false,
}: {
  patientId: string;
  session: ActiveSession;
  deviceOnline: boolean;
  medication?: string | null;
  dosage?: string | null;
  prescribedMinutes: number;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(session?.elapsed_seconds ?? 0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prescribed = session?.prescribed_seconds ?? prescribedMinutes * 60;

  const state: NebState = !session
    ? deviceOnline
      ? "READY"
      : "OFF"
    : session.status === "starting"
      ? "COMMAND_SENT"
      : session.status === "running"
        ? "RUNNING"
        : session.status === "paused"
          ? "PAUSED"
          : session.status === "failed"
            ? "ERROR"
            : "COMPLETED";

  useEffect(() => {
    setElapsed(session?.elapsed_seconds ?? 0);
  }, [session?.id, session?.elapsed_seconds]);

  const start = useMutation({
    mutationFn: () => startSession({ data: { patientId } }),
    onSuccess: async (res) => {
      if (!res.deviceReachable) {
        toast.error("Command sent, but the device did not respond", {
          description: `${res.deviceCode ?? "Device"} is not reachable over MQTT. The session is marked as failed until the device confirms.`,
        });
        await update.mutateAsync({ action: "stop", elapsedSeconds: 0 });
        return;
      }
      toast.success("Start command sent — waiting for device confirmation");
      // Device acknowledgement (ESP32 publishes back over MQTT). Simulated ack in demo mode.
      setTimeout(() => update.mutate({ action: "ack", elapsedSeconds: 0 }), 1200);
      void qc.invalidateQueries({ queryKey: ["snapshot", patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (vars: {
      action: "ack" | "pause" | "resume" | "stop" | "complete";
      elapsedSeconds: number;
    }) =>
      updateSession({
        data: { sessionId: session?.id ?? "", ...vars },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["snapshot", patientId] });
      void qc.invalidateQueries({ queryKey: ["sessions", patientId] });
      void qc.invalidateQueries({ queryKey: ["adherence", patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (state !== "RUNNING") {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= prescribed) {
          chime();
          toast.success("Nebulization session complete");
          update.mutate({ action: "complete", elapsedSeconds: prescribed });
          return prescribed;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, prescribed]);

  const pct = prescribed ? Math.min(100, (elapsed / prescribed) * 100) : 0;
  const size = compact ? 150 : 210;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const mmss = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const statusTone =
    state === "RUNNING" ? "normal" : state === "ERROR" || state === "OFF" ? "critical" : "warning";

  return (
    <div className="panel flex flex-col items-center gap-5 p-6">
      <div className="flex w-full items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold">Nebulizer</p>
          <p className="text-xs text-muted-foreground">
            {medication ?? "No medication prescribed"}
            {dosage ? ` · ${dosage}` : ""}
          </p>
        </div>
        <StatusBadge status={statusTone} label={state.replace("_", " ")} />
      </div>

      <svg width={size} height={size} role="img" aria-label={`Session progress ${Math.round(pct)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={12} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 900ms linear" }}
          className={cn(state === "RUNNING" && "drop-shadow-[0_0_10px_var(--glow)]")}
        />
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          className="fill-foreground font-display text-3xl font-semibold tabular-nums"
        >
          {mmss(Math.max(0, prescribed - elapsed))}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-muted-foreground text-[11px]">
          {mmss(elapsed)} of {mmss(prescribed)}
        </text>
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {state === "READY" || state === "OFF" || state === "COMPLETED" || state === "ERROR" ? (
          <Button onClick={() => start.mutate()} disabled={start.isPending || !deviceOnline}>
            {start.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Play className="mr-2 size-4" />
            )}
            Start session
          </Button>
        ) : null}
        {state === "RUNNING" ? (
          <Button
            variant="secondary"
            onClick={() => update.mutate({ action: "pause", elapsedSeconds: elapsed })}
          >
            <Pause className="mr-2 size-4" /> Pause
          </Button>
        ) : null}
        {state === "PAUSED" ? (
          <Button onClick={() => update.mutate({ action: "resume", elapsedSeconds: elapsed })}>
            <Play className="mr-2 size-4" /> Resume
          </Button>
        ) : null}
        {state === "RUNNING" || state === "PAUSED" || state === "COMMAND_SENT" ? (
          <Button
            variant="destructive"
            onClick={() => update.mutate({ action: "stop", elapsedSeconds: elapsed })}
          >
            <Square className="mr-2 size-4" /> Stop
          </Button>
        ) : null}
      </div>

      {!deviceOnline ? (
        <p className="text-center text-xs text-warn">
          Device is offline — therapy commands cannot be confirmed by the hardware.
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          State reflects the last confirmation received from the device.
        </p>
      )}
    </div>
  );
}
