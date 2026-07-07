"use client";

import { useMemo, useState } from "react";

type ManualInvoiceLineFormValue = {
  description: string;
  quantity: string;
  unitLabel: string;
  unitRate: string;
};

const emptyLine: ManualInvoiceLineFormValue = {
  description: "",
  quantity: "1",
  unitLabel: "service",
  unitRate: "",
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function lineNetAmount(line: ManualInvoiceLineFormValue) {
  return numberValue(line.quantity) * numberValue(line.unitRate);
}

export function ManualOutgoingInvoiceLinesEditor({
  initialLines,
  errors,
}: {
  initialLines?: ManualInvoiceLineFormValue[];
  errors: string[] | undefined;
}) {
  const [lines, setLines] = useState<ManualInvoiceLineFormValue[]>(
    initialLines?.length ? initialLines : [emptyLine],
  );

  const subtotal = useMemo(
    () => lines.reduce((total, line) => total + lineNetAmount(line), 0),
    [lines],
  );

  const linesJson = useMemo(() => JSON.stringify(lines), [lines]);

  function updateLine(
    index: number,
    field: keyof ManualInvoiceLineFormValue,
    value: string,
  ) {
    setLines((currentLines) =>
      currentLines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  }

  function addLine() {
    setLines((currentLines) => [...currentLines, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLines((currentLines) =>
      currentLines.length === 1
        ? currentLines
        : currentLines.filter((_, lineIndex) => lineIndex !== index),
    );
  }

  return (
    <section className="mt-4">
      <input type="hidden" name="linesJson" value={linesJson} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Invoice lines</h3>
          <p className="text-sm text-neutral-600">Add one row per invoice concept.</p>
        </div>
        <button
          type="button"
          onClick={addLine}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium"
        >
          Add line
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {lines.map((line, index) => {
          const linePrefix = `manual-line-${index}`;
          return (
            <div
              key={index}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-3"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_110px_120px_120px_110px_auto]">
                <div>
                  <label htmlFor={`${linePrefix}-description`} className="block text-sm font-medium text-neutral-800">
                    Description / concept
                  </label>
                  <textarea
                    id={`${linePrefix}-description`}
                    value={line.description}
                    onChange={(event) => updateLine(index, "description", event.target.value)}
                    rows={2}
                    required
                    maxLength={500}
                    placeholder="Consulting services"
                    className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`${linePrefix}-quantity`} className="block text-sm font-medium text-neutral-800">Quantity</label>
                  <input
                    id={`${linePrefix}-quantity`}
                    value={line.quantity}
                    onChange={(event) => updateLine(index, "quantity", event.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`${linePrefix}-unit`} className="block text-sm font-medium text-neutral-800">Unit</label>
                  <input
                    id={`${linePrefix}-unit`}
                    value={line.unitLabel}
                    onChange={(event) => updateLine(index, "unitLabel", event.target.value)}
                    required
                    maxLength={40}
                    className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`${linePrefix}-rate`} className="block text-sm font-medium text-neutral-800">Rate</label>
                  <input
                    id={`${linePrefix}-rate`}
                    value={line.unitRate}
                    onChange={(event) => updateLine(index, "unitRate", event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <p className="block text-sm font-medium text-neutral-800">Net</p>
                  <p className="mt-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                    {formatAmount(lineNetAmount(line))}
                  </p>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:text-neutral-400"
                  >
                    Remove line
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {errors?.map((error) => (
        <p key={error} className="mt-2 text-sm text-red-700">{error}</p>
      ))}
      <div className="mt-3 grid gap-2 rounded-md border border-neutral-200 bg-white p-3 text-sm md:max-w-sm">
        <div className="flex justify-between gap-4">
          <span>Subtotal</span>
          <span className="font-medium">{formatAmount(subtotal)}</span>
        </div>
        <div className="flex justify-between gap-4 text-neutral-600">
          <span>VAT</span>
          <span>Calculated from project billing</span>
        </div>
        <div className="flex justify-between gap-4 text-neutral-600">
          <span>Total</span>
          <span>Confirmed after saving</span>
        </div>
      </div>
    </section>
  );
}
