import { createFileRoute } from "@tanstack/react-router";
import { RolePlaceholder } from "@/components/smartneb/role-placeholder";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "admin dashboard — SmartNeb" },
      { name: "description", content: "SmartNeb admin workspace for connected respiratory therapy oversight." },
      { property: "og:title", content: "admin dashboard — SmartNeb" },
      { property: "og:description", content: "SmartNeb admin workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RolePlaceholder role="admin" />,
});
