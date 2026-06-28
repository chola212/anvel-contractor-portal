"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavigationItem } from "@/constants/navigation";

type SideNavigationProps = {
  items: NavigationItem[];
};

export function SideNavigation({ items }: SideNavigationProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-neutral-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-neutral-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase text-teal-700">
          ERP Utilities Consulting Services Ltd.
        </p>
        <p className="mt-2 text-xl font-semibold tracking-tight">
          ANVEL Contractor Portal
        </p>
      </div>
      <nav aria-label="Primary navigation" className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const isCurrent = item.href === pathname;

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={[
                    "block rounded-md px-3 py-2 text-sm transition-colors",
                    isCurrent
                      ? "border border-teal-200 bg-teal-50 text-teal-950"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
                  ].join(" ")}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {item.description}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
