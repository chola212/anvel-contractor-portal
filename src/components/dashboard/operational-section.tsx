type OperationalSectionProps = {
  title: string;
  description: string;
  items: string[];
};

export function OperationalSection({
  title,
  description,
  items,
}: OperationalSectionProps) {
  return (
    <section className="rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      </div>
      <ul className="divide-y divide-neutral-200">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="text-sm font-medium text-neutral-800">{item}</span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
              Planned
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
