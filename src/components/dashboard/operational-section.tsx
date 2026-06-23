import type { DashboardMetric } from "@/lib/dashboard/queries";

type OperationalSectionProps = {
  title: string;
  description: string;
  metrics: DashboardMetric[];
};

export function OperationalSection({
  title,
  description,
  metrics,
}: OperationalSectionProps) {
  return (
    <section className="rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      </div>
      <ul className="divide-y divide-neutral-200">
        {metrics.map((metric) => (
          <li
            key={metric.label}
            className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {metric.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-600">
                {metric.description}
              </p>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-teal-700">
              {metric.value}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
