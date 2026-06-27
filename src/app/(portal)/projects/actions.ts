"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .refine((value) => value === null || datePattern.test(value), {
    message: "Enter a valid date.",
  });

const optionalRate = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? Number(value) : null))
  .refine((value) => value === null || !Number.isNaN(value), {
    message: "Enter a valid sales rate.",
  })
  .refine((value) => value === null || value >= 0, {
    message: "Sales rate cannot be negative.",
  })
  .refine((value) => value === null || value <= 10000, {
    message: "Sales rate is too high for this portal.",
  });

const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a project name.")
      .max(120, "Keep the project name under 120 characters."),
    clientLabel: optionalText,
    country: optionalText,
    startDate: optionalDate,
    endDate: optionalDate,
    status: z.enum(["planned", "active", "paused", "closed"], {
      message: "Select a valid status.",
    }),
    adminNotes: optionalText,
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.endDate >= value.startDate,
    {
      message: "End date must be on or after the start date.",
      path: ["endDate"],
    },
  );

const updateProjectSchema = createProjectSchema.extend({
  projectId: z.string().uuid("Project is missing."),
});

const projectIdSchema = z.object({
  projectId: z.string().uuid("Project is missing."),
});

const createAssignmentSchema = z
  .object({
    projectId: z.string().uuid("Project is missing."),
    contractorId: z.string().uuid("Select a contractor."),
    hourlyRate: z.coerce
      .number()
      .gt(0, "Hourly rate must be greater than zero.")
      .max(10000, "Hourly rate is too high for this portal."),
    salesRate: optionalRate,
    startDate: optionalDate,
    endDate: optionalDate,
    status: z.enum(["planned", "active", "paused", "closed"], {
      message: "Select a valid status.",
    }),
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.endDate >= value.startDate,
    {
      message: "End date must be on or after the start date.",
      path: ["endDate"],
    },
  );

const updateAssignmentSchema = z.object({
  assignmentId: z.string().uuid("Assignment is missing."),
  projectId: z.string().uuid("Project is missing."),
  contractorId: z.string().uuid("Contractor is missing."),
  hourlyRate: z.coerce
    .number()
    .gt(0, "Hourly rate must be greater than zero.")
    .max(10000, "Hourly rate is too high for this portal."),
  salesRate: optionalRate,
  status: z.enum(["planned", "active", "paused", "closed"], {
    message: "Select a valid status.",
  }),
  startDate: optionalDate,
  endDate: optionalDate,
}).refine(
  (value) =>
    !value.startDate || !value.endDate || value.endDate >= value.startDate,
  {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  },
);

export type ProjectCreateState = {
  message: string | null;
  status: "idle" | "success" | "error";
  fieldErrors: Record<string, string[] | undefined>;
};

export async function createProjectAction(
  _previousState: ProjectCreateState,
  formData: FormData,
): Promise<ProjectCreateState> {
  await requireRole(["admin"]);

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    clientLabel: formData.get("clientLabel"),
    country: formData.get("country"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes"),
  });

  if (!parsed.success) {
    return {
      message: "Check the project details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name: parsed.data.name,
      client_label: parsed.data.clientLabel,
      country: parsed.data.country,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      status: parsed.data.status,
      currency: "EUR",
      admin_notes: parsed.data.adminNotes,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !project) {
    return {
      message:
        error?.code === "23514"
          ? "Project dates or status do not match the database rules."
          : `Could not create the project: ${error?.message ?? "Unknown error"}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(
  _previousState: ProjectCreateState,
  formData: FormData,
): Promise<ProjectCreateState> {
  const profile = await requireRole(["admin"]);

  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    clientLabel: formData.get("clientLabel"),
    country: formData.get("country"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes"),
  });

  if (!parsed.success) {
    return {
      message: "Check the project details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: currentProject, error: loadError } = await supabase
    .from("projects")
    .select("id,name,client_label,country,start_date,end_date,status,admin_notes")
    .eq("id", parsed.data.projectId)
    .maybeSingle<{
      id: string;
      name: string;
      client_label: string | null;
      country: string | null;
      start_date: string | null;
      end_date: string | null;
      status: string;
      admin_notes: string | null;
    }>();

  if (loadError || !currentProject) {
    return {
      message: "This project could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  const nextProject = {
    name: parsed.data.name,
    client_label: parsed.data.clientLabel,
    country: parsed.data.country,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    status: parsed.data.status,
    admin_notes: parsed.data.adminNotes,
  };

  const { error: updateError } = await supabase
    .from("projects")
    .update(nextProject)
    .eq("id", currentProject.id);

  if (updateError) {
    return {
      message:
        updateError.code === "23514"
          ? "Project dates or status do not match the database rules."
          : `Could not update the project: ${updateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "project_updated",
    entity_type: "project",
    entity_id: currentProject.id,
    metadata: {
      before: {
        name: currentProject.name,
        client_label: currentProject.client_label,
        country: currentProject.country,
        start_date: currentProject.start_date,
        end_date: currentProject.end_date,
        status: currentProject.status,
        admin_notes: currentProject.admin_notes,
      },
      after: nextProject,
    },
  });

  if (auditError) {
    return {
      message: `Project updated, but the audit log could not be recorded: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath(`/projects/${currentProject.id}`);
  revalidatePath("/projects");

  return {
    message: "Project updated.",
    status: "success",
    fieldErrors: {},
  };
}

export async function removeProjectAction(
  _previousState: ProjectCreateState,
  formData: FormData,
): Promise<ProjectCreateState> {
  const profile = await requireRole(["admin"]);
  const parsed = projectIdSchema.safeParse({
    projectId: formData.get("projectId"),
  });

  if (!parsed.success) {
    return {
      message: "Project is missing.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,status")
    .eq("id", parsed.data.projectId)
    .maybeSingle<{ id: string; name: string; status: string }>();

  if (projectError || !project) {
    return {
      message: "This project could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  const [assignmentCount, timesheetCount] = await Promise.all([
    supabase
      .from("contractor_projects")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("timesheets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
  ]);

  if (assignmentCount.error || timesheetCount.error) {
    return {
      message:
        assignmentCount.error?.message ??
        timesheetCount.error?.message ??
        "Could not check project history.",
      status: "error",
      fieldErrors: {},
    };
  }

  const hasHistory =
    (assignmentCount.count ?? 0) > 0 || (timesheetCount.count ?? 0) > 0;

  if (hasHistory) {
    const { error: archiveError } = await supabase
      .from("projects")
      .update({ status: "closed" })
      .eq("id", project.id);

    if (archiveError) {
      return {
        message: `Could not close the project: ${archiveError.message}`,
        status: "error",
        fieldErrors: {},
      };
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_profile_id: profile.id,
      action: "project_closed_for_history",
      entity_type: "project",
      entity_id: project.id,
      metadata: {
        from_status: project.status,
        assignment_count: assignmentCount.count ?? 0,
        timesheet_count: timesheetCount.count ?? 0,
      },
    });

    if (auditError) {
      return {
        message: `Project closed, but audit logging failed: ${auditError.message}`,
        status: "error",
        fieldErrors: {},
      };
    }

    revalidatePath(`/projects/${project.id}`);
    revalidatePath("/projects");

    return {
      message: "Project has business history, so it was closed instead of deleted.",
      status: "success",
      fieldErrors: {},
    };
  }

  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", project.id);

  if (deleteError) {
    return {
      message: `Could not delete the project: ${deleteError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "project_deleted",
    entity_type: "project",
    entity_id: project.id,
    metadata: {
      name: project.name,
    },
  });

  if (auditError) {
    return {
      message: `Project deleted, but audit logging failed: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath("/projects");

  return {
    message: "Project deleted.",
    status: "success",
    fieldErrors: {},
  };
}

export async function createAssignmentAction(
  _previousState: ProjectCreateState,
  formData: FormData,
): Promise<ProjectCreateState> {
  const profile = await requireRole(["admin"]);

  const parsed = createAssignmentSchema.safeParse({
    projectId: formData.get("projectId"),
    contractorId: formData.get("contractorId"),
    hourlyRate: formData.get("hourlyRate"),
    salesRate: formData.get("salesRate"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      message: "Check the assignment details and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: assignment, error } = await supabase
    .from("contractor_projects")
    .insert({
      project_id: parsed.data.projectId,
      contractor_id: parsed.data.contractorId,
      hourly_rate: parsed.data.hourlyRate,
      sales_rate: parsed.data.salesRate,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      status: parsed.data.status,
      currency: "EUR",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !assignment) {
    return {
      message:
        error?.code === "23505"
          ? "This contractor already has an assignment for this project and start date."
          : error?.code === "23514"
            ? "Assignment dates, rates or status do not match the database rules."
            : `Could not create the assignment: ${error?.message ?? "Unknown error"}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "contractor_project_created",
    entity_type: "contractor_project",
    entity_id: assignment.id,
    metadata: {
      project_id: parsed.data.projectId,
      contractor_id: parsed.data.contractorId,
      status: parsed.data.status,
    },
  });

  if (auditError) {
    return {
      message: `Assignment created, but the audit log could not be recorded: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath(`/contractors/${parsed.data.contractorId}`);
  revalidatePath("/projects");
  revalidatePath("/contractors");

  return {
    message: "Assignment created.",
    status: "success",
    fieldErrors: {},
  };
}

export async function updateAssignmentStatusAction(
  _previousState: ProjectCreateState,
  formData: FormData,
): Promise<ProjectCreateState> {
  const profile = await requireRole(["admin"]);

  const parsed = updateAssignmentSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    projectId: formData.get("projectId"),
    contractorId: formData.get("contractorId"),
    hourlyRate: formData.get("hourlyRate"),
    salesRate: formData.get("salesRate"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    return {
      message: "Check the assignment update and try again.",
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: currentAssignment, error: loadError } = await supabase
    .from("contractor_projects")
    .select("id,contractor_id,project_id,hourly_rate,sales_rate,status,start_date,end_date")
    .eq("id", parsed.data.assignmentId)
    .maybeSingle<{
      id: string;
      contractor_id: string;
      project_id: string;
      hourly_rate: number | string;
      sales_rate: number | string | null;
      status: string;
      start_date: string | null;
      end_date: string | null;
    }>();

  if (loadError || !currentAssignment) {
    return {
      message: "This assignment could not be found.",
      status: "error",
      fieldErrors: {},
    };
  }

  if (
    currentAssignment.project_id !== parsed.data.projectId ||
    currentAssignment.contractor_id !== parsed.data.contractorId
  ) {
    return {
      message: "This assignment does not match the current project or contractor.",
      status: "error",
      fieldErrors: {},
    };
  }

  const { data: conflictingEntries, error: conflictError } = await supabase
    .from("timesheets")
    .select("id,timesheet_entries(work_date)")
    .eq("contractor_id", currentAssignment.contractor_id)
    .eq("project_id", currentAssignment.project_id)
    .returns<
      {
        id: string;
        timesheet_entries: { work_date: string }[];
      }[]
    >();

  if (conflictError) {
    return {
      message: `Could not check existing timesheets: ${conflictError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const invalidEntry = conflictingEntries
    .flatMap((timesheet) => timesheet.timesheet_entries)
    .find(
      (entry) =>
        (parsed.data.startDate && entry.work_date < parsed.data.startDate) ||
        (parsed.data.endDate && entry.work_date > parsed.data.endDate),
    );

  if (invalidEntry) {
    return {
      message: `Assignment dates cannot be changed because existing timesheet hours on ${invalidEntry.work_date} would fall outside the assignment period.`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: updateError } = await supabase
    .from("contractor_projects")
    .update({
      hourly_rate: parsed.data.hourlyRate,
      sales_rate: parsed.data.salesRate,
      status: parsed.data.status,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
    })
    .eq("id", parsed.data.assignmentId);

  if (updateError) {
    return {
      message:
        updateError.code === "23514"
          ? "Assignment rates, status or end date do not match the database rules."
          : `Could not update the assignment: ${updateError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "contractor_project_status_updated",
    entity_type: "contractor_project",
    entity_id: parsed.data.assignmentId,
    metadata: {
      from_status: currentAssignment.status,
      to_status: parsed.data.status,
      from_hourly_rate: currentAssignment.hourly_rate,
      to_hourly_rate: parsed.data.hourlyRate,
      from_sales_rate: currentAssignment.sales_rate,
      to_sales_rate: parsed.data.salesRate,
      from_start_date: currentAssignment.start_date,
      to_start_date: parsed.data.startDate,
      from_end_date: currentAssignment.end_date,
      to_end_date: parsed.data.endDate,
    },
  });

  if (auditError) {
    return {
      message: `Assignment updated, but the audit log could not be recorded: ${auditError.message}`,
      status: "error",
      fieldErrors: {},
    };
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath(`/contractors/${parsed.data.contractorId}`);
  revalidatePath("/projects");
  revalidatePath("/contractors");

  return {
    message: "Assignment updated.",
    status: "success",
    fieldErrors: {},
  };
}
