type ModulePlaceholderProps = {
  title: string;
  description: string;
  nextPhase: string;
};

export function ModulePlaceholder({
  title,
  description,
  nextPhase,
}: ModulePlaceholderProps) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          {description}
        </p>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <p className="text-sm font-medium text-neutral-500">Module status</p>
        <p className="mt-2 text-lg font-semibold text-neutral-950">
          Planned for {nextPhase}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
          This route exists so the base application shell can be reviewed
          without introducing database tables, authentication, or production
          workflows before their approved phases.
        </p>
      </section>
    </div>
  );
}
