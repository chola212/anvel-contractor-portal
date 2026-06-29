export function FieldErrors({ errors }: { errors?: string[] }) {
  return errors?.map((error) => (
    <p key={error} className="text-sm text-red-700">
      {error}
    </p>
  ));
}

export function fieldClassName() {
  return "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100";
}

export function statusClassName(status: "idle" | "success" | "error") {
  return [
    "mt-5 rounded-md border px-3 py-2 text-sm",
    status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-800",
  ].join(" ");
}
