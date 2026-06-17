import type { ReactNode } from "react";

import { getNavigationForRole } from "@/constants/navigation";
import { SessionBar } from "@/components/auth/session-bar";
import { requireCurrentProfile } from "@/lib/auth/profile";

import { SideNavigation } from "./side-navigation";
import { TopBar } from "./top-bar";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const profile = await requireCurrentProfile();
  const navigation = getNavigationForRole(profile.role);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="flex min-h-screen">
        <SideNavigation items={navigation} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar items={navigation} />
          <SessionBar profile={profile} />
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
