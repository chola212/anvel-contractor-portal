import Link from "next/link";

import { formatCurrency, formatDate } from "@/lib/projects/format";
import type { ProjectAssignment } from "@/lib/projects/types";

import { ProjectStatusBadge } from "./project-status-badge";
import { AssignmentUpdateForm } from "./assignment-update-form";

type AssignmentListProps = {
  assignments: ProjectAssignment[];
  context: "contractor" | "project";
  showHourlyRate: boolean;
  showSalesRate: boolean;
  showAssignmentControls?: boolean;
};

export function AssignmentList({
  assignments,
  context,
  showHourlyRate,
  showSalesRate,
  showAssignmentControls = false,
}: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No assignments found
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Assignments will appear here after a contractor is linked to a project.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-950">
          Project assignments
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Existing assignments. Rate editing is not part of this phase.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                {context === "contractor" ? "Project" : "Contractor"}
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Dates
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Hourly rate
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Sales rate
              </th>
              {showAssignmentControls ? (
                <th scope="col" className="px-5 py-3 font-medium">
                  Manage
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td className="px-5 py-4 align-top">
                  {context === "contractor" ? (
                    <>
                      <p className="font-medium text-neutral-950">
                        {assignment.project?.name ?? "Unknown project"}
                      </p>
                      <p className="mt-1 text-neutral-600">
                        {assignment.project?.client_label ?? "No client label"}
                      </p>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/contractors/${assignment.contractor_id}`}
                        className="font-medium text-teal-800 hover:text-teal-950"
                      >
                        {assignment.contractor?.legal_name ?? "Unknown contractor"}
                      </Link>
                      <p className="mt-1 text-neutral-600">
                        {assignment.contractor?.email ?? "No email"}
                      </p>
                    </>
                  )}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {formatDate(assignment.start_date)} to {formatDate(assignment.end_date)}
                </td>
                <td className="px-5 py-4 align-top">
                  <ProjectStatusBadge status={assignment.status} />
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {showHourlyRate
                    ? formatCurrency(assignment.hourly_rate, assignment.currency)
                    : "Hidden for this role"}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {showSalesRate
                    ? formatCurrency(assignment.sales_rate, assignment.currency)
                    : "Hidden for this role"}
                </td>
                {showAssignmentControls ? (
                  <td className="px-5 py-4 align-top">
                    <AssignmentUpdateForm assignment={assignment} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
