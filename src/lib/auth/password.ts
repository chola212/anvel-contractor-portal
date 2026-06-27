import { z } from "zod";

export const passwordRules = [
  "At least 12 characters",
  "At least one uppercase letter",
  "At least one lowercase letter",
  "At least one number",
] as const;

export const passwordSchema = z
  .string()
  .min(12, passwordRules[0])
  .regex(/[A-Z]/, passwordRules[1])
  .regex(/[a-z]/, passwordRules[2])
  .regex(/[0-9]/, passwordRules[3]);
