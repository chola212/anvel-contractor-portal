import Link from "next/link";

import { formatDate } from "@/lib/projects/format";
import type { ProjectRecord } from "@/lib/projects/types";

import { ProjectStatusBadge } from "./project-status-badge";

type ProjectListProps = {
  projects: ProjectRecord[];
};

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No projects found
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Create fake development project records before testing assignments.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-950">Project records</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Assignment editing is intentionally left for a later approved step.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Project
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Country
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Dates
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {projects.map((project) => (
              <tr key={project.id}>
                <td className="px-5 py-4 align-top">
                  <p className="font-medium text-neutral-950">{project.name}</p>
                  <p className="mt-1 text-neutral-600">
                    {project.client_label ?? "No client label"}
                  </p>
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {project.country ?? "Not set"}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {formatDate(project.start_date)} to {formatDate(project.end_date)}
                </td>
                <td className="px-5 py-4 align-top">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-5 py-4 align-top">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-teal-800 hover:text-teal-950"
                  >
                    View project
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
