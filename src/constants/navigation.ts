import type { Role } from "@/lib/auth/roles";

export type NavigationItem = {
  label: string;
  description: string;
  href: string;
  allowedRoles: Role[];
};

const allRoles: Role[] = ["admin", "operations", "contractor"];
const internalRoles: Role[] = ["admin", "operations"];

export const primaryNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    description: "Operational overview",
    href: "/",
    allowedRoles: allRoles,
  },
  {
    label: "My Profile",
    description: "Contractor profile details",
    href: "/profile",
    allowedRoles: ["contractor"],
  },
  {
    label: "Contractors",
    description: "Profiles and onboarding status",
    href: "/contractors",
    allowedRoles: internalRoles,
  },
  {
    label: "Projects",
    description: "Assignments and rates",
    href: "/projects",
    allowedRoles: internalRoles,
  },
  {
    label: "Documents",
    description: "Contractor document review",
    href: "/documents",
    allowedRoles: allRoles,
  },
  {
    label: "Timesheets",
    description: "Monthly hours and approvals",
    href: "/timesheets",
    allowedRoles: allRoles,
  },
  {
    label: "Invoices",
    description: "Invoice review workflow",
    href: "/invoices",
    allowedRoles: allRoles,
  },
  {
    label: "Payments",
    description: "Manual payment tracking",
    href: "/payments",
    allowedRoles: ["admin", "contractor"],
  },
  {
    label: "Exports",
    description: "Accountant export files",
    href: "/exports",
    allowedRoles: ["admin"],
  },
  {
    label: "Settings",
    description: "Portal configuration",
    href: "/settings",
    allowedRoles: ["admin"],
  },
];

export function getNavigationForRole(role: Role) {
  return primaryNavigation.filter((item) => item.allowedRoles.includes(role));
}
