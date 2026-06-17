type DetailFieldProps = {
  label: string;
  value: string;
};

export function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="border-b border-neutral-100 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-950">{value}</dd>
    </div>
  );
}
