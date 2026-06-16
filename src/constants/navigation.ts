export type NavigationItem = {
  label: string;
  description: string;
  href: string;
};

export const primaryNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    description: "Operational overview",
    href: "/",
  },
  {
    label: "Contractors",
    description: "Profiles and onboarding status",
    href: "/contractors",
  },
  {
    label: "Projects",
    description: "Assignments and rates",
    href: "/projects",
  },
  {
    label: "Documents",
    description: "Contractor document review",
    href: "/documents",
  },
  {
    label: "Timesheets",
    description: "Monthly hours and approvals",
    href: "/timesheets",
  },
  {
    label: "Invoices",
    description: "Invoice review workflow",
    href: "/invoices",
  },
  {
    label: "Payments",
    description: "Manual payment tracking",
    href: "/payments",
  },
  {
    label: "Exports",
    description: "Accountant export files",
    href: "/exports",
  },
  {
    label: "Settings",
    description: "Portal configuration",
    href: "/settings",
  },
];
