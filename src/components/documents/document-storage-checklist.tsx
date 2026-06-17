const storageItems = [
  "Create the contractor-documents Supabase bucket as private.",
  "Allow PDF files only, with a 10 MB file size limit.",
  "Use contractor-scoped paths under contractors/{contractor_id}/documents/.",
  "Use signed URLs later; do not expose public document links.",
];

export function DocumentStorageChecklist() {
  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <p className="text-sm font-medium text-neutral-500">
        Storage readiness
      </p>
      <h2 className="mt-2 text-lg font-semibold text-neutral-950">
        Private bucket required before uploads
      </h2>
      <ul className="mt-4 grid gap-3 text-sm text-neutral-700 md:grid-cols-2">
        {storageItems.map((item) => (
          <li key={item} className="rounded-md border border-neutral-200 p-3">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
