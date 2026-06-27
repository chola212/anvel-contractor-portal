type FilterField =
  | {
      name: "month" | "from" | "to" | "uploadedMonth";
      label: string;
      type: "month";
      value?: string;
    }
  | {
      name: "status" | "documentType";
      label: string;
      type: "select";
      value?: string;
      options: { value: string; label: string }[];
    };

type OperationalFilterFormProps = {
  fields: FilterField[];
};

export function OperationalFilterForm({ fields }: OperationalFilterFormProps) {
  return (
    <form
      method="get"
      className="rounded-md border border-neutral-200 bg-white p-5"
    >
      <div className="grid gap-4 md:grid-cols-4">
        {fields.map((field) => (
          <label
            key={field.name}
            className="flex flex-col gap-1 text-sm font-medium text-neutral-700"
          >
            {field.label}
            {field.type === "month" ? (
              <input
                name={field.name}
                type="month"
                defaultValue={field.value}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
              />
            ) : (
              <select
                name={field.name}
                defaultValue={field.value ?? ""}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
              >
                <option value="">All</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          className="rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
        >
          Apply filters
        </button>
        <a
          href="?"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Clear
        </a>
      </div>
    </form>
  );
}
