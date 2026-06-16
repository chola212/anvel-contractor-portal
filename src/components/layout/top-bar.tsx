"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavigationItem } from "@/constants/navigation";

type TopBarProps = {
  items: NavigationItem[];
};

export function TopBar({ items }: TopBarProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-teal-700 lg:hidden">
            ANVEL Contractor Portal
          </p>
          <p className="truncate text-sm font-medium text-neutral-600">
            Internal contractor operations
          </p>
        </div>
        <div className="shrink-0 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600">
          Phase 1 shell
        </div>
      </div>
      <nav
        aria-label="Mobile navigation"
        className="border-t border-neutral-200 px-4 py-2 lg:hidden"
      >
        <ul className="flex gap-2 overflow-x-auto">
          {items.map((item) => {
            const isCurrent = item.href === pathname;

            return (
              <li key={item.label} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={[
                    "block rounded-md px-3 py-2 text-sm font-medium",
                    isCurrent
                      ? "bg-teal-700 text-white"
                      : "text-neutral-700 hover:bg-neutral-100",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
