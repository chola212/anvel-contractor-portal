export const roles = ["admin", "operations", "contractor"] as const;

export type Role = (typeof roles)[number];

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
};

export function isRole(value: string): value is Role {
  return roles.includes(value as Role);
}

export function isPortalRole(role: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(role);
}
