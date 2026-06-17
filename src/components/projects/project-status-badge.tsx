import { projectStatusLabels } from "@/lib/projects/format";
import type { ProjectStatus } from "@/lib/projects/types";

type ProjectStatusBadgeProps = {
  status: ProjectStatus;
};

const statusClasses: Record<ProjectStatus, string> = {
  planned: "border-sky-200 bg-sky-50 text-sky-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  paused: "border-amber-200 bg-amber-50 text-amber-800",
  closed: "border-neutral-300 bg-neutral-100 text-neutral-600",
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
        statusClasses[status],
      ].join(" ")}
    >
      {projectStatusLabels[status]}
    </span>
  );
}
