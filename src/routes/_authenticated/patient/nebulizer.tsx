import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets } from "lucide-react";
import { toast } from "sonner";
import { listRefills, refillChamber } from "@/lib/smartneb.functions";
import { PatientPage, useSnapshot } from "@/components/smartneb/patient-layout";
import { NebulizerControl } from "@/components/smartneb/nebulizer-control";
import { Gauge, StatusBadge } from "@/components/smartneb/vitals";
import { ErrorState, LoadingSkeleton } from "@/components/smartneb/states";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/patient/nebulizer")({
  head: () => ({
    meta: [
      { title: "My Nebulizer — SmartNeb" },
      {
        name: "description",
        content: "Control your connected nebulizer, track chamber fluid level and log medication refills.",
      },
      { property: "og:title", content: "My Nebulizer — SmartNeb" },
      { property: "og:description", content: "Start, pause and monitor your nebulization therapy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PatientPage title="My nebulizer" subtitle="Device control and medication chamber">
      {({ patientId }) => <NebulizerBody patientId={patientId} />}
    </PatientPage>
  ),
});

function NebulizerBody({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const snap = useSnapshot(patientId);
  const refills = useQuery({
    queryKey: ["refills", patientId],
    queryFn: () => listRefills({ data: { patientId } }),
  });
  const [level, setLevel] = useState(100);

  const refill = useMutation({
    mutationFn: () => refillChamber({ data: { patientId, levelAfter: level } }),
    onSuccess: () => {
      toast.success("Refill logged");
      void qc.invalidateQueries({ queryKey: ["refills", patientId] });
      void qc.invalidateQueries({ queryKey: ["snapshot", patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (snap.isLoading) return <LoadingSkeleton rows={3} />;
  if (snap.isError || !snap.data)
    return <ErrorState message={(snap.error as Error)?.message} onRetry={() => snap.refetch()} />;

  const { device, carePlan, activeSession } = snap.data;
  const fluid = Number(device?.fluid_level ?? 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <NebulizerControl
          patientId={patientId}
          session={activeSession}
          deviceOnline={device?.status === "online"}
          medication={carePlan?.medication ?? null}
          dosage={carePlan?.dosage ?? null}
          prescribedMinutes={carePlan?.duration_minutes ?? 10}
        />

        <section className="panel space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-semibold">Prescription</p>
            <StatusBadge status={carePlan ? "normal" : "warning"} label={carePlan ? "Active plan" : "No plan"} />
          </div>
          {carePlan ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ["Medication", carePlan.medication],
                ["Dosage", carePlan.dosage],
                ["Duration", `${carePlan.duration_minutes} min`],
                ["Frequency", `${carePlan.frequency_per_day}× per day`],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border bg-surface-2 p-4">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-1 text-sm font-medium">{v ?? "--"}</dd>
                </div>
              ))}
              {carePlan.instructions ? (
                <div className="rounded-lg border bg-surface-2 p-4 sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Instructions</dt>
                  <dd className="mt-1 text-sm">{carePlan.instructions}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your doctor has not published a care plan yet.
            </p>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="panel flex flex-col items-center gap-4 p-5">
          <p className="self-start font-display text-sm font-semibold">Medication chamber</p>
          <Gauge value={fluid} label="Fluid level" unit="%" />
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Refill to</span>
              <span className="tabular-nums">{level}%</span>
            </div>
            <Slider value={[level]} min={0} max={100} step={5} onValueChange={(v) => setLevel(v[0] ?? 0)} />
            <Button className="w-full" onClick={() => refill.mutate()} disabled={refill.isPending}>
              <Droplets className="mr-2 size-4" /> Log refill
            </Button>
          </div>
        </section>

        <section className="panel p-5">
          <p className="mb-3 font-display text-sm font-semibold">Recent refills</p>
          {refills.data && refills.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {refills.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border bg-surface-2 px-3 py-2">
                  <span className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  <span className="tabular-nums">{Number(r.level_after)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No refills logged yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
