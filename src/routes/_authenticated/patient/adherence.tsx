import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdherence } from "@/lib/smartneb.functions";
import { PatientPage } from "@/components/smartneb/patient-layout";
import { Gauge, StatusBadge } from "@/components/smartneb/vitals";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/smartneb/states";

export const Route = createFileRoute("/_authenticated/patient/adherence")({
  head: () => ({
    meta: [
      { title: "Therapy Adherence — SmartNeb" },
      {
        name: "description",
        content: "Track your therapy adherence score, completed sessions and missed doses over the last 30 days.",
      },
      { property: "og:title", content: "Therapy Adherence — SmartNeb" },
      { property: "og:description", content: "See how consistently you follow your prescribed therapy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PatientPage title="Adherence" subtitle="Your therapy consistency over the last 30 days">
      {({ patientId }) => <AdherenceBody patientId={patientId} />}
    </PatientPage>
  ),
});

function AdherenceBody({ patientId }: { patientId: string }) {
  const q = useQuery({
    queryKey: ["adherence", patientId],
    queryFn: () => getAdherence({ data: { patientId, days: 30 } }),
  });

  if (q.isLoading) return <LoadingSkeleton rows={3} />;
  if (q.isError || !q.data)
    return <ErrorState message={(q.error as Error)?.message} onRetry={() => q.refetch()} />;

  const { records, completed, partial, missed, total, score } = q.data;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="panel flex flex-col items-center gap-3 p-6">
          <p className="self-start font-display text-sm font-semibold">Adherence score</p>
          <Gauge value={score} label="Last 30 days" unit="%" />
        </div>
        <div className="panel grid grid-cols-3 gap-4 p-6 lg:col-span-2">
          {[
            ["Completed", completed, "normal"],
            ["Partial", partial, "warning"],
            ["Missed", missed, "critical"],
          ].map(([label, value, tone]) => (
            <div key={String(label)} className="rounded-xl border bg-surface-2 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{Number(value)}</p>
              <div className="mt-2">
                <StatusBadge
                  status={tone as "normal" | "warning" | "critical"}
                  label={total ? `${Math.round((Number(value) / total) * 100)}% of doses` : "no doses"}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <p className="mb-3 font-display text-sm font-semibold">Dose log</p>
        {records.length === 0 ? (
          <EmptyState title="No scheduled doses" description="Your care plan has no scheduled doses yet." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border bg-surface-2 px-4 py-3 text-sm"
              >
                <span>{new Date(r.scheduled_for).toLocaleDateString()}</span>
                <StatusBadge
                  status={
                    r.status === "completed" ? "normal" : r.status === "missed" ? "critical" : "warning"
                  }
                  label={r.status}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
