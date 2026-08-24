import { createFileRoute } from "@tanstack/react-router";
import { RolePlaceholder } from "@/components/smartneb/role-placeholder";

export const Route = createFileRoute("/_authenticated/super-admin/dashboard")({
  head: () => ({
    meta: [
      { title: "super-admin dashboard — SmartNeb" },
      { name: "description", content: "SmartNeb super-admin workspace for connected respiratory therapy oversight." },
      { property: "og:title", content: "super-admin dashboard — SmartNeb" },
      { property: "og:description", content: "SmartNeb super-admin workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RolePlaceholder role="super-admin" />,
});
