import type { DocumentRequirementRecord } from "./types";

export const contractorDocumentRequirementNames = [
  "Contractor Agreement",
  "NDA",
  "Assignment Schedule",
  "Other",
] as const;

export function normaliseDocumentType(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function getDocumentRequirementFilterOptions(
  requirements: DocumentRequirementRecord[],
) {
  const options = new Map<string, string>();

  for (const requirement of requirements) {
    const value = normaliseDocumentType(requirement.name);

    if (value) {
      options.set(value, requirement.name);
    }
  }

  return [...options].map(([value, label]) => ({ value, label }));
}
