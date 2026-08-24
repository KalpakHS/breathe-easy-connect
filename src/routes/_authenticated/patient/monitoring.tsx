import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTelemetrySeries } from "@/lib/smartneb.functions";
import { PatientPage } from "@/components/smartneb/patient-layout";
import { RANGES, TrendChart } from "@/components/smartneb/charts";
import { ErrorState, LoadingSkeleton } from "@/components/smartneb/states";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/patient/monitoring")({
  head: () => ({
    meta: [
      { title: "Health Monitoring — SmartNeb" },
      {
        name: "description",
        content: "Historical heart rate, SpO₂, temperature, air quality and battery telemetry trends.",
      },
      { property: "og:title", content: "Health Monitoring — SmartNeb" },
      { property: "og:description", content: "Explore your respiratory telemetry trends over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PatientPage title="Health monitoring" subtitle="Telemetry trends from your device">
      {({ patientId }) => <MonitoringBody patientId={patientId} />}
    </PatientPage>
  ),
});

function MonitoringBody({ patientId }: { patientId: string }) {
  const [minutes, setMinutes] = useState(360);
  const q = useQuery({
    queryKey: ["series", patientId, minutes],
    queryFn: () => getTelemetrySeries({ data: { patientId, minutes } }),
    refetchInterval: minutes <= 60 ? 10_000 : false,
  });

  if (q.isLoading) return <LoadingSkeleton rows={3} />;
  if (q.isError || !q.data)
    return <ErrorState message={(q.error as Error)?.message} onRetry={() => q.refetch()} />;

  const health = q.data.health.map((r) => ({
    t: r.recorded_at,
    bpm: r.bpm == null ? null : Number(r.bpm),
    spo2: r.spo2 == null ? null : Number(r.spo2),
    temp: r.body_temperature == null ? null : Number(r.body_temperature),
  }));
  const env = q.data.environment.map((r) => ({
    t: r.recorded_at,
    ambient: r.ambient_temperature == null ? null : Number(r.ambient_temperature),
    humidity: r.humidity == null ? null : Number(r.humidity),
    aqi: r.aqi == null ? null : Number(r.aqi),
  }));
  const batt = q.data.battery.map((r) => ({
    t: r.recorded_at,
    percentage: r.percentage == null ? null : Number(r.percentage),
    voltage: r.voltage == null ? null : Number(r.voltage),
  }));

  const empty = health.length === 0 && env.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.label}
            size="sm"
            variant={minutes === r.minutes ? "default" : "outline"}
            onClick={() => setMinutes(r.minutes)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {empty ? (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          No telemetry recorded in this window yet.
        </div>
      ) : (
        <>
          <section className="panel p-5">
            <p className="mb-3 font-display text-sm font-semibold">Heart rate &amp; SpO₂</p>
            <TrendChart
              data={health}
              series={[
                { key: "bpm", label: "Heart rate (bpm)", color: "var(--chart-1)" },
                { key: "spo2", label: "SpO₂ (%)", color: "var(--chart-2)" },
              ]}
            />
          </section>

          <section className="panel p-5">
            <p className="mb-3 font-display text-sm font-semibold">Body temperature</p>
            <TrendChart
              data={health}
              area
              domain={[34, 41]}
              series={[{ key: "temp", label: "Body temp (°C)", color: "var(--chart-4)" }]}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="panel p-5">
              <p className="mb-3 font-display text-sm font-semibold">Environment</p>
              <TrendChart
                data={env}
                height={220}
                series={[
                  { key: "ambient", label: "Ambient (°C)", color: "var(--chart-3)" },
                  { key: "humidity", label: "Humidity (%)", color: "var(--chart-2)" },
                  { key: "aqi", label: "AQI", color: "var(--chart-5)" },
                ]}
              />
            </div>
            <div className="panel p-5">
              <p className="mb-3 font-display text-sm font-semibold">Battery</p>
              <TrendChart
                data={batt}
                height={220}
                area
                series={[
                  { key: "percentage", label: "Charge (%)", color: "var(--chart-2)" },
                  { key: "voltage", label: "Voltage (V)", color: "var(--chart-1)" },
                ]}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
