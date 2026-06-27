export type SearchParamsInput = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validMonth(value: string | undefined) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

function validOption(value: string | undefined, allowed: readonly string[]) {
  return value && allowed.includes(value) ? value : undefined;
}

export function parseMonthRangeFilters(searchParams: SearchParamsInput) {
  return {
    month: validMonth(firstValue(searchParams.month)),
    from: validMonth(firstValue(searchParams.from)),
    to: validMonth(firstValue(searchParams.to)),
  };
}

export function parseStatusFilter(
  searchParams: SearchParamsInput,
  allowed: readonly string[],
) {
  return validOption(firstValue(searchParams.status), allowed);
}

export function parseDocumentTypeFilter(searchParams: SearchParamsInput) {
  const value = firstValue(searchParams.documentType);

  return value && /^[a-z0-9_/-]+$/i.test(value) ? value : undefined;
}

export function parseUploadedMonthFilter(searchParams: SearchParamsInput) {
  return validMonth(firstValue(searchParams.uploadedMonth));
}
