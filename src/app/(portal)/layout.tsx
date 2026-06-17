import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

type PortalLayoutProps = {
  children: ReactNode;
};

export default function PortalLayout({ children }: PortalLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
