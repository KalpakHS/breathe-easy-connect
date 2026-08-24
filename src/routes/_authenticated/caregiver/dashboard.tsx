import { createFileRoute } from "@tanstack/react-router";
import { RolePlaceholder } from "@/components/smartneb/role-placeholder";

export const Route = createFileRoute("/_authenticated/caregiver/dashboard")({
  head: () => ({
    meta: [
      { title: "caregiver dashboard — SmartNeb" },
      { name: "description", content: "SmartNeb caregiver workspace for connected respiratory therapy oversight." },
      { property: "og:title", content: "caregiver dashboard — SmartNeb" },
      { property: "og:description", content: "SmartNeb caregiver workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RolePlaceholder role="caregiver" />,
});
