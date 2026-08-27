import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BatteryMedium,
  Cpu,
  Droplets,
  Gauge,
  HeartPulse,
  Radio,
  Siren,
  Thermometer,
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import {
  pushSimulatedTelemetry,
  raiseAlert,
  triggerSOS,
} from "@/lib/smartneb.functions";
import { PatientPage, greeting, useSnapshot } from "@/components/smartneb/patient-layout";
import { freshness, StatusBadge, VitalCard, type VitalStatus } from "@/components/smartneb/vitals";
import { NebulizerControl } from "@/components/smartneb/nebulizer-control";
import { ErrorState, LoadingSkeleton } from "@/components/smartneb/states";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SOSPanel } from "@/components/smartneb/sos-panel";

export const Route = createFileRoute("/_authenticated/patient/dashboard")({
  head: () => ({
    meta: [
      { title: "Patient Dashboard — SmartNeb" },
      {
        name: "description",
        content:
          "Live vitals, nebulizer status, device telemetry and therapy adherence for your connected SmartNeb device.",
      },
      { property: "og:title", content: "Patient Dashboard — SmartNeb" },
      {
        property: "og:description",
        content: "Your live respiratory therapy command center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PatientPage title="Command center" subtitle="Your health and nebulizer status">
      {({ patientId, fullName }) => <DashboardBody patientId={patientId} fullName={fullName} />}
    </PatientPage>
  ),
});

function spo2Status(v: number | null, threshold: number): VitalStatus {
  if (v == null) return "unknown";
  if (v < threshold - 3) return "critical";
  if (v < threshold) return "warning";
  return "normal";
}

function DashboardBody({ patientId, fullName }: { patientId: string; fullName: string }) {
  const qc = useQueryClient();
  const snap = useSnapshot(patientId);
  const spokenRef = useRef(0);

  // Real ESP32 telemetry (Firebase Realtime Database).
  const dev = useDeviceTelemetry({
    patientId,
    mrn: snap.data?.patient?.mrn ?? null,
    deviceCode: snap.data?.device?.device_code ?? null,
  });
  const t = dev.telemetry;

  // Archive real readings so history, reports and the alert engine stay truthful.
  const ingest = useMutation({
    mutationFn: () =>
      ingestDeviceTelemetry({
        data: {
          patientId,
          bpm: t.bpm,
          spo2: t.spo2,
          bodyTemperature: t.bodyTemperature,
          ambientTemperature: t.ambientTemperature,
          batteryPercentage: t.battery.percentage,
          batteryVoltage: t.battery.voltage,
          batteryCurrent: t.battery.current,
          batteryPower: t.battery.power,
          batteryTemperature: t.battery.temperature,
          relay: t.nebulizer.relay,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot", patientId] }),
  });
  const ingestRef = useRef(ingest);
  ingestRef.current = ingest;
  const onlineForIngest = t.online;

  useEffect(() => {
    if (!onlineForIngest) return;
    const id = setInterval(() => ingestRef.current.mutate(), 30_000);
    return () => clearInterval(id);
  }, [onlineForIngest]);

  const alert = useMutation({
    mutationFn: (vars: {
      type: string;
      severity: "critical" | "warning" | "info";
      value: number;
      threshold: number;
      message: string;
    }) => raiseAlert({ data: { patientId, ...vars } }),
    onSuccess: (res) => {
      if (res.created) void qc.invalidateQueries({ queryKey: ["snapshot", patientId] });
    },
  });

  const sos = useMutation({
    mutationFn: () => triggerSOS({ data: { patientId, source: "manual" } }),
    onSuccess: (res) => {
      toast.error("Emergency SOS sent", {
        description: `${res.notified} care team member(s) notified with your latest vitals.`,
      });
      void qc.invalidateQueries({ queryKey: ["sos-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { patient, device, health, healthPrev, environment, battery, carePlan, activeSession } =
    snap.data ?? ({} as NonNullable<typeof snap.data>);
  // Live device values take precedence; stored records are the fallback history.
  const spo2 = t.spo2 ?? (health?.spo2 == null ? null : Number(health.spo2));
  const bpm = t.bpm ?? (health?.bpm == null ? null : Number(health.bpm));
  const temp =
    t.bodyTemperature ?? (health?.body_temperature == null ? null : Number(health.body_temperature));
  const ambient =
    t.ambientTemperature ??
    (environment?.ambient_temperature == null ? null : Number(environment.ambient_temperature));
  const spo2Threshold = Number(patient?.spo2_threshold ?? 92);
  const battPct =
    t.battery.percentage ?? (battery?.percentage == null ? null : Number(battery.percentage));
  const fresh = freshness(health?.recorded_at);
  const liveText = dev.loading
    ? "Connecting to SmartNeb device…"
    : dev.error
      ? "Unable to connect to device data"
      : t.online
        ? `Device online · live ESP32 telemetry${t.lastUpdated ? ` · updated ${freshness(new Date(t.lastUpdated).toISOString()).text}` : ""}`
        : `Device offline — showing last stored reading (${fresh.text})`;

  // Threshold engine: SpO2 below configured threshold raises an alert + audio/voice warning.
  useEffect(() => {
    if (spo2 == null || spo2 >= spo2Threshold) return;
    const now = Date.now();
    if (now - spokenRef.current < 60_000) return;
    spokenRef.current = now;
    alert.mutate({
      type: "spo2",
      severity: spo2 < spo2Threshold - 3 ? "critical" : "warning",
      value: spo2,
      threshold: spo2Threshold,
      message: `SpO2 ${spo2}% is below the configured threshold of ${spo2Threshold}%`,
    });
    try {
      const u = new SpeechSynthesisUtterance(
        `Warning. Oxygen saturation ${spo2} percent, below your threshold.`,
      );
      window.speechSynthesis.speak(u);
    } catch {
      /* speech unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spo2, spo2Threshold]);

  if (snap.isLoading) return <LoadingSkeleton rows={4} />;
  if (snap.isError || !snap.data)
    return <ErrorState message={(snap.error as Error)?.message} onRetry={() => snap.refetch()} />;



  return (
    <div className="space-y-6">
      <section className="panel grid-mesh flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            {greeting()}, {patient?.full_name ?? fullName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{liveText}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={t.online ? "normal" : "critical"}
              label={t.online ? "ESP32 connected" : "ESP32 offline"}
            />
            <StatusBadge
              status={dev.firebaseConnected ? "normal" : "warning"}
              label={dev.firebaseConnected ? "Device cloud linked" : "Device cloud down"}
            />
            <StatusBadge
              status={t.nebulizer.relay ? "normal" : "unknown"}
              label={t.nebulizer.relay ? "Nebulizer ON" : "Nebulizer OFF"}
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={sos.isPending}>
                <Siren className="mr-2 size-4" /> Emergency SOS
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send an emergency SOS?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your assigned doctor and caregiver are alerted immediately with your latest
                  vitals (SpO₂ {spo2 ?? "--"}%, heart rate {bpm ?? "--"} bpm, temperature{" "}
                  {temp ?? "--"} °C), device status and the current time. Only use this in a real
                  emergency. If you are in immediate danger, also call local emergency services.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-critical text-critical-foreground hover:bg-critical/90"
                  onClick={() => sos.mutate()}
                >
                  Yes, send SOS now
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <VitalCard
          label="Heart rate"
          value={bpm}
          unit="bpm"
          icon={<HeartPulse className="size-4" />}
          status={bpm == null ? "unknown" : bpm > 120 || bpm < 50 ? "warning" : "normal"}
          trend={bpm != null && healthPrev?.bpm != null ? bpm - Number(healthPrev.bpm) : null}
          hint={fresh.text}
        />
        <VitalCard
          label="SpO₂"
          value={spo2}
          unit="%"
          icon={<Activity className="size-4" />}
          status={spo2Status(spo2, spo2Threshold)}
          trend={spo2 != null && healthPrev?.spo2 != null ? spo2 - Number(healthPrev.spo2) : null}
          hint={`threshold ${spo2Threshold}%`}
        />
        <VitalCard
          label="Body temperature"
          value={temp}
          unit="°C"
          icon={<Thermometer className="size-4" />}
          status={temp == null ? "unknown" : temp >= 38 ? "warning" : "normal"}
          trend={
            temp != null && healthPrev?.body_temperature != null
              ? temp - Number(healthPrev.body_temperature)
              : null
          }
          hint={fresh.text}
        />
        <VitalCard
          label="Device battery"
          value={battPct}
          unit="%"
          icon={<BatteryMedium className="size-4" />}
          status={
            battPct == null ? "unknown" : battPct < 15 ? "critical" : battPct < 30 ? "warning" : "normal"
          }
          hint={battery ? `${battery.voltage ?? "--"} V · ${battery.cell_temperature ?? "--"} °C` : ""}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-semibold">Environment</p>
            <StatusBadge
              status={
                environment?.aqi == null
                  ? "unknown"
                  : Number(environment.aqi) > 100
                    ? "warning"
                    : "normal"
              }
              label={
                environment?.aqi == null
                  ? "No data"
                  : Number(environment.aqi) > 100
                    ? "Poor air"
                    : "Good air"
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Ambient temp",
                value: environment?.ambient_temperature,
                unit: "°C",
                icon: Thermometer,
              },
              { label: "Humidity", value: environment?.humidity, unit: "%", icon: Droplets },
              { label: "Air quality index", value: environment?.aqi, unit: "AQI", icon: Wind },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border bg-surface-2 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <m.icon className="size-3.5" /> {m.label}
                </div>
                <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                  {m.value == null ? "--" : Number(m.value)}
                  <span className="ml-1 text-xs text-muted-foreground">{m.unit}</span>
                </p>
              </div>
            ))}
          </div>
          {environment?.simulated ? (
            <p className="text-xs text-muted-foreground">
              Environmental values are currently produced by the simulated sensor feed.
            </p>
          ) : null}

          <div className="rounded-xl border bg-surface-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{device?.device_code ?? "No device"}</p>
                  <p className="text-xs text-muted-foreground">
                    Firmware {device?.firmware ?? "--"} · last seen{" "}
                    {freshness(device?.last_seen_at).text}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={device?.status === "online" ? "normal" : "critical"}
                  label={device?.status === "online" ? "Online" : "Offline"}
                />
                <StatusBadge
                  status={device?.mqtt_connected ? "normal" : "warning"}
                  label={device?.mqtt_connected ? "MQTT linked" : "MQTT down"}
                />
                <StatusBadge
                  status={device?.cloud_connected ? "normal" : "warning"}
                  label={device?.cloud_connected ? "Cloud synced" : "Cloud offline"}
                />
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Radio className="size-3.5" /> chamber {Number(device?.fluid_level ?? 0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <NebulizerControl
          patientId={patientId}
          session={activeSession}
          deviceOnline={device?.status === "online"}
          medication={carePlan?.medication ?? null}
          dosage={carePlan?.dosage ?? null}
          prescribedMinutes={carePlan?.duration_minutes ?? 10}
          compact
        />
      </section>

      <section className="panel p-5">
        <div className="mb-3 flex items-center gap-2">
          <Gauge className="size-4 text-primary" />
          <p className="font-display text-sm font-semibold">Active alerts</p>
        </div>
        {snap.data.activeAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts. All readings are within range.</p>
        ) : (
          <ul className="space-y-2">
            {snap.data.activeAlerts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-surface-2 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.type} · {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge
                  status={a.severity === "critical" ? "critical" : a.severity === "warning" ? "warning" : "normal"}
                  label={a.severity}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <SOSPanel
        patientId={patientId}
        canRespond={false}
        includeResolved
        title="My emergency SOS history"
      />
    </div>
  );
}
