import type { ReactNode } from "react";

import { primaryNavigation } from "@/constants/navigation";

import { SideNavigation } from "./side-navigation";
import { TopBar } from "./top-bar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="flex min-h-screen">
        <SideNavigation items={primaryNavigation} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar items={primaryNavigation} />
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
