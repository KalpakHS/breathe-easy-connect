import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bot, Cpu, ShieldCheck, Siren, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartNeb — Connected Respiratory Therapy" },
      {
        name: "description",
        content:
          "SmartNeb links IoT nebulizers, live vitals and clinical teams so respiratory therapy is monitored, adherent and safe.",
      },
      { property: "og:title", content: "SmartNeb — Connected Respiratory Therapy" },
      {
        property: "og:description",
        content: "Real-time nebulizer control, vitals monitoring, adherence tracking and emergency escalation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Activity, title: "Live vitals", body: "Heart rate, SpO₂ and temperature streamed from the device every few seconds." },
  { icon: Wind, title: "Nebulizer control", body: "Start, pause and stop therapy with device-confirmed session state." },
  { icon: Siren, title: "SOS escalation", body: "One tap notifies the assigned clinician and caregiver with the latest vitals." },
  { icon: Cpu, title: "Device telemetry", body: "Battery, chamber level, MQTT and cloud connectivity at a glance." },
  { icon: Bot, title: "AI assistant", body: "Plain-language answers grounded strictly in the patient's own data." },
  { icon: ShieldCheck, title: "Role-based access", body: "Patients, doctors, caregivers and admins see only what they should." },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Wind className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">SmartNeb</span>
        </div>
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="grid-mesh border-y">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            IoT respiratory therapy platform
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
            Every breath, monitored and accounted for
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
            SmartNeb connects nebulizer hardware to patients and their care teams — with live telemetry,
            adherence tracking, threshold alerts and emergency escalation.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth">Open the platform</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="panel p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        SmartNeb · clinical decisions remain with the treating clinician.
      </footer>
    </main>
  );
}
