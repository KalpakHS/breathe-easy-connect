import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { buildReport } from "@/lib/smartneb.functions";
import { exportReportCSV, exportReportPDF, type SmartNebReport } from "@/lib/report-export";
import { PatientPage } from "@/components/smartneb/patient-layout";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/smartneb/states";

export const Route = createFileRoute("/_authenticated/patient/reports")({
  head: () => ({
    meta: [
      { title: "Reports — SmartNeb" },
      {
        name: "description",
        content: "Generate printable clinical summaries of vitals, adherence and therapy sessions.",
      },
      { property: "og:title", content: "Reports — SmartNeb" },
      { property: "og:description", content: "Share a clinical summary with your care team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PatientPage title="Reports" subtitle="Clinical summaries you can print or share">
      {({ patientId }) => <ReportsBody patientId={patientId} />}
    </PatientPage>
  ),
});

type Report = Awaited<ReturnType<typeof buildReport>>;

function ReportsBody({ patientId }: { patientId: string }) {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<Report | null>(null);

  const gen = useMutation({
    mutationFn: () => buildReport({ data: { patientId, days } }),
    onSuccess: (r) => {
      setReport(r);
      toast.success("Report generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const download = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartneb-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-center justify-between gap-4 p-5 print:hidden">
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30, 90].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
              Last {d} days
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
            {gen.isPending ? "Generating…" : "Generate report"}
          </Button>
          {report ? (
            <>
              <Button variant="outline" onClick={() => exportReportPDF(report as SmartNebReport)}>
                <FileDown className="mr-2 size-4" /> PDF
              </Button>
              <Button variant="outline" onClick={() => exportReportCSV(report as SmartNebReport)}>
                <FileSpreadsheet className="mr-2 size-4" /> CSV
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 size-4" /> Print
              </Button>
              <Button variant="ghost" onClick={download}>
                Raw JSON
              </Button>
            </>
          ) : null}
        </div>
      </section>

      {gen.isError ? <ErrorState message={(gen.error as Error).message} /> : null}

      {report ? (
        <article className="panel space-y-6 p-8">
          <header className="border-b pb-4">
            <h2 className="font-display text-2xl font-semibold">Clinical summary</h2>
            <p className="text-sm text-muted-foreground">
              {report.patient?.full_name} · MRN {report.patient?.mrn} · last {report.rangeDays} days ·
              generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-4">
            {[
              ["Avg heart rate", report.vitals.avgBpm, "bpm"],
              ["Avg SpO₂", report.vitals.avgSpo2, "%"],
              ["Lowest SpO₂", report.vitals.minSpo2, "%"],
              ["Avg temperature", report.vitals.avgTemp, "°C"],
            ].map(([k, v, u]) => (
              <div key={String(k)} className="rounded-xl border bg-surface-2 p-4">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {v == null ? "--" : String(v)}
                  <span className="ml-1 text-xs text-muted-foreground">{u}</span>
                </p>
              </div>
            ))}
          </section>

          <section>
            <h3 className="mb-2 font-display text-sm font-semibold">Care plan</h3>
            <p className="text-sm text-muted-foreground">
              {report.carePlan
                ? `${report.carePlan.medication} ${report.carePlan.dosage ?? ""} · ${report.carePlan.duration_minutes} min × ${report.carePlan.frequency_per_day}/day`
                : "No published care plan."}
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-display text-sm font-semibold">
              Sessions ({report.sessions.length})
            </h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {report.sessions.slice(0, 12).map((s) => (
                <li key={s.id}>
                  {new Date(s.started_at).toLocaleString()} — {s.status} ·{" "}
                  {Math.round((s.elapsed_seconds ?? 0) / 60)} min
                </li>
              ))}
              {report.sessions.length === 0 ? <li>No sessions in range.</li> : null}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-display text-sm font-semibold">Alerts ({report.alerts.length})</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {report.alerts.slice(0, 12).map((a) => (
                <li key={a.id}>
                  {new Date(a.created_at).toLocaleString()} — [{a.severity}] {a.message}
                </li>
              ))}
              {report.alerts.length === 0 ? <li>No alerts in range.</li> : null}
            </ul>
          </section>

          <footer className="border-t pt-4 text-xs text-muted-foreground">
            SmartNeb generated summary. Clinical decisions remain the responsibility of the treating
            clinician.
          </footer>
        </article>
      ) : (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          Choose a range and generate a report to preview it here.
        </div>
      )}
    </div>
  );
}
