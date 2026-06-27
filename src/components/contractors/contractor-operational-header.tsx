import Link from "next/link";

type ContractorOperationalHeaderProps = {
  contractorId: string;
  contractorName: string;
  sectionTitle: string;
  selectorHref: string;
  selectorLabel: string;
};

export function ContractorOperationalHeader({
  contractorId,
  contractorName,
  sectionTitle,
  selectorHref,
  selectorLabel,
}: ContractorOperationalHeaderProps) {
  return (
    <section className="border-b border-neutral-200 pb-5">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/contractors/${contractorId}`}
          className="inline-flex min-h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-900 transition-colors hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        >
          Back to contractor
        </Link>
        <Link
          href={selectorHref}
          className="inline-flex min-h-9 items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        >
          {selectorLabel}
        </Link>
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
        {contractorName} - {sectionTitle}
      </h1>
    </section>
  );
}
