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

const createAssignmentSchema = z
  .object({
    projectId: z.string().uuid("Project is missing."),
    contractorId: z.string().uuid("Select a contractor."),
    hourlyRate: z.coerce
      .number()
      .gt(0, "Hourly rate must be greater than zero.")
      .max(10000, "Hourly rate is too high for this portal."),
    salesRate: z
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
      }),
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
