import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listCareCarePlans } from "@/lib/caregiver-detail.functions";
import { CaregiverPage } from "@/components/smartneb/caregiver-layout";
import { useSignedIn } from "@/components/smartneb/use-signed-in";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/smartneb/states";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/caregiver/care-plans")({
  head: () => ({
    meta: [
      { title: "Care Plans — SmartNeb Caregiver" },
      {
        name: "description",
        content:
          "Read-only view of doctor-prescribed medication, dosage, schedule, duration and instructions for your assigned patients.",
      },
      { property: "og:title", content: "Care Plans — SmartNeb Caregiver" },
      { property: "og:description", content: "Prescribed therapy plans for the patients you support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarePlansPage,
});

function CarePlansPage() {
  const signedIn = useSignedIn() === true;
  const q = useQuery({
    queryKey: ["care-plans-all"],
    queryFn: () => listCareCarePlans(),
    enabled: signedIn,
    retry: false,
  });

  return (
    <CaregiverPage title="Care Plans" subtitle="Prescribed by the treating doctor — view only">
      {() =>
        q.isPending ? (
          <LoadingSkeleton rows={3} />
        ) : q.isError ? (
          <ErrorState message={(q.error as Error)?.message} onRetry={() => q.refetch()} />
        ) : q.data.length === 0 ? (
          <EmptyState title="No care plans" description="Published therapy plans appear here." />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Caregivers can review plans but cannot change a doctor&apos;s clinical prescription.
            </p>
            {q.data.map((plan) => (
              <article key={plan.id} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-semibold">
                      {plan.medication} · {plan.dosage}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      <Link
                        to="/caregiver/patients/$patientId"
                        params={{ patientId: plan.patient_id }}
                        className="underline-offset-2 hover:underline"
                      >
                        {plan.patientName} · {plan.mrn}
                      </Link>
                      {plan.doctorName ? ` · prescribed by ${plan.doctorName}` : ""}
                    </p>
                  </div>
                  <Badge variant={plan.status === "published" ? "default" : "outline"}>{plan.status}</Badge>
                </div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                  {[
                    ["Session length", `${plan.duration_minutes} min`],
                    ["Frequency", `${plan.frequency_per_day}× daily`],
                    ["Start", plan.start_date],
                    ["End", plan.end_date ?? "Ongoing"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border bg-surface-2 p-3">
                      <dt className="text-xs text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5 font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                {plan.time_slots?.length ? (
                  <p className="mt-3 text-sm">
                    <span className="text-muted-foreground">Scheduled times: </span>
                    <span className="font-medium">{plan.time_slots.join(" · ")}</span>
                  </p>
                ) : null}
                {plan.instructions ? (
                  <p className="mt-3 text-sm text-muted-foreground">{plan.instructions}</p>
                ) : null}
              </article>
            ))}
          </div>
        )
      }
    </CaregiverPage>
  );
}
