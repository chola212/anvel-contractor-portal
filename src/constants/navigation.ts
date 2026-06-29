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
    description: "Overview",
    href: "/",
    allowedRoles: allRoles,
  },
  {
    label: "My Profile",
    description: "Profile",
    href: "/profile",
    allowedRoles: ["contractor"],
  },
  {
    label: "Contractors",
    description: "Contractors",
    href: "/contractors",
    allowedRoles: internalRoles,
  },
  {
    label: "Projects",
    description: "Projects",
    href: "/projects",
    allowedRoles: internalRoles,
  },
  {
    label: "Project Documents",
    description: "Project files",
    href: "/project-documents",
    allowedRoles: ["admin"],
  },
  {
    label: "Onboarding",
    description: "Contract setup",
    href: "/onboarding",
    allowedRoles: ["admin"],
  },
  {
    label: "Documents",
    description: "Documents",
    href: "/documents",
    allowedRoles: allRoles,
  },
  {
    label: "Timesheets",
    description: "Timesheets",
    href: "/timesheets",
    allowedRoles: allRoles,
  },
  {
    label: "Invoices",
    description: "Invoices",
    href: "/invoices",
    allowedRoles: allRoles,
  },
  {
    label: "Outgoing Invoices",
    description: "Client billing",
    href: "/outgoing-invoices",
    allowedRoles: ["admin"],
  },
  {
    label: "Payments",
    description: "Payments",
    href: "/payments",
    allowedRoles: ["admin", "contractor"],
  },
  {
    label: "Exports",
    description: "Exports",
    href: "/exports",
    allowedRoles: ["admin"],
  },
  {
    label: "Settings",
    description: "Settings",
    href: "/settings",
    allowedRoles: ["admin"],
  },
];

export function getNavigationForRole(role: Role) {
  return primaryNavigation.filter((item) => item.allowedRoles.includes(role));
}
