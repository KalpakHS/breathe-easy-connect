import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, HeartPulse, Search, Thermometer, Wind } from "lucide-react";
import { DoctorPage } from "@/components/smartneb/doctor-layout";
import { EmptyState, LoadingSkeleton } from "@/components/smartneb/states";
import { StatusBadge, freshness } from "@/components/smartneb/vitals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/doctor/patients/")({
  head: () => ({
    meta: [
      { title: "My Patients — SmartNeb Clinician" },
      {
        name: "description",
        content:
          "Searchable roster of your assigned respiratory patients with live SpO₂, heart rate, temperature and device status.",
      },
      { property: "og:title", content: "My Patients — SmartNeb Clinician" },
      {
        property: "og:description",
        content: "Assigned patient roster with live vitals, alert status and device connectivity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorPatientsPage,
});

type Filter = "all" | "critical" | "therapy" | "offline";

function DoctorPatientsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <DoctorPage title="My Patients" subtitle="Everyone assigned to you by an administrator">
      {({ patients, isLoading }) => {
        const rows = useMemo(() => {
          const needle = q.trim().toLowerCase();
          return patients
            .filter((p) =>
              needle
                ? p.full_name.toLowerCase().includes(needle) ||
                  p.mrn.toLowerCase().includes(needle) ||
                  (p.condition ?? "").toLowerCase().includes(needle)
                : true,
            )
            .filter((p) =>
              filter === "critical"
                ? p.criticalAlerts > 0
                : filter === "therapy"
                  ? p.sessionStatus === "running"
                  : filter === "offline"
                    ? p.deviceStatus !== "online"
                    : true,
            )
            .sort((a, b) => b.criticalAlerts - a.criticalAlerts || b.activeAlerts - a.activeAlerts);
        }, [patients, q, filter]);

        if (isLoading) return <LoadingSkeleton rows={4} />;

        return (
          <div className="space-y-4">
            <div className="panel flex flex-wrap items-center gap-3 p-4">
              <div className="flex min-w-[220px] flex-1 items-center gap-2">
                <Search className="size-4 text-muted-foreground" aria-hidden />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, MRN or condition"
                  aria-label="Search patients"
                  className="h-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All"],
                    ["critical", "Critical"],
                    ["therapy", "In therapy"],
                    ["offline", "Device offline"],
                  ] as [Filter, string][]
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={filter === key ? "default" : "outline"}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <EmptyState
                title="No patients match"
                description="Adjust the search or filters, or ask an administrator to assign patients to you."
              />
            ) : (
              <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {rows.map((p) => {
                  const fresh = freshness(p.recordedAt);
                  const spo2Status =
                    p.spo2 == null
                      ? "unknown"
                      : p.spo2 < p.spo2_threshold - 3
                        ? "critical"
                        : p.spo2 < p.spo2_threshold
                          ? "warning"
                          : "normal";
                  return (
                    <li key={p.id} className="panel p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-display text-base font-semibold">{p.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.mrn} · {p.condition ?? "No condition recorded"}
                          </p>
                        </div>
                        <StatusBadge status={spo2Status} />
                      </div>

                      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg border bg-surface-2 p-2.5">
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            <Activity className="size-3" aria-hidden /> SpO₂
                          </dt>
                          <dd className="mt-0.5 font-display text-base font-semibold tabular-nums">
                            {p.spo2 ?? "--"}%
                          </dd>
                        </div>
                        <div className="rounded-lg border bg-surface-2 p-2.5">
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            <HeartPulse className="size-3" aria-hidden /> HR
                          </dt>
                          <dd className="mt-0.5 font-display text-base font-semibold tabular-nums">
                            {p.bpm ?? "--"}
                          </dd>
                        </div>
                        <div className="rounded-lg border bg-surface-2 p-2.5">
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            <Thermometer className="size-3" aria-hidden /> Temp
                          </dt>
                          <dd className="mt-0.5 font-display text-base font-semibold tabular-nums">
                            {p.bodyTemperature == null ? "--" : p.bodyTemperature.toFixed(1)}°
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={p.deviceStatus === "online" ? "secondary" : "outline"}>
                          {p.deviceCode ?? "No device"} · {p.deviceStatus ?? "unassigned"}
                        </Badge>
                        {p.sessionStatus === "running" ? (
                          <Badge variant="secondary" className="gap-1">
                            <Wind className="size-3" aria-hidden /> In therapy
                          </Badge>
                        ) : null}
                        {p.activeAlerts > 0 ? (
                          <Badge variant={p.criticalAlerts > 0 ? "destructive" : "outline"}>
                            {p.activeAlerts} active alert{p.activeAlerts === 1 ? "" : "s"}
                          </Badge>
                        ) : null}
                        <span>{fresh.text}</span>
                      </div>

                      <div className="mt-4">
                        <Button asChild size="sm" className="w-full">
                          <Link to="/doctor/patients/$patientId" params={{ patientId: p.id }}>
                            Open clinical workspace
                          </Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      }}
    </DoctorPage>
  );
}
