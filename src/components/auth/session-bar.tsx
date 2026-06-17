import { logoutAction } from "@/app/auth/actions";
import type { Profile } from "@/lib/auth/roles";

type SessionBarProps = {
  profile: Profile;
};

export function SessionBar({ profile }: SessionBarProps) {
  return (
    <section className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 text-sm text-neutral-700 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-neutral-950">
            {profile.full_name ?? profile.email}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-neutral-500">
            {profile.role}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-100 md:w-auto"
          >
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}
