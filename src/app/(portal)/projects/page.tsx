import { ProjectList } from "@/components/projects/project-list";
import { requireRole } from "@/lib/auth/profile";
import { getProjectsForStaff } from "@/lib/projects/queries";

export default async function ProjectsPage() {
  await requireRole(["admin", "operations"]);
  const projects = await getProjectsForStaff();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Projects
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Read-only project records and contractor assignment overview for
          internal users. Client labels must stay generic in development.
        </p>
      </section>

      <ProjectList projects={projects} />
    </div>
  );
}
