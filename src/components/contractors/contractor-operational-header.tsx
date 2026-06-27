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
      <div className="flex flex-wrap gap-3 text-sm font-medium">
        <Link
          href={`/contractors/${contractorId}`}
          className="text-teal-800 hover:text-teal-950"
        >
          Back to contractor
        </Link>
        <Link href={selectorHref} className="text-teal-800 hover:text-teal-950">
          {selectorLabel}
        </Link>
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
        {contractorName} - {sectionTitle}
      </h1>
    </section>
  );
}
