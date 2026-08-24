import { createFileRoute } from "@tanstack/react-router";
import { RolePlaceholder } from "@/components/smartneb/role-placeholder";

export const Route = createFileRoute("/_authenticated/doctor/dashboard")({
  head: () => ({
    meta: [
      { title: "doctor dashboard — SmartNeb" },
      { name: "description", content: "SmartNeb doctor workspace for connected respiratory therapy oversight." },
      { property: "og:title", content: "doctor dashboard — SmartNeb" },
      { property: "og:description", content: "SmartNeb doctor workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RolePlaceholder role="doctor" />,
});
