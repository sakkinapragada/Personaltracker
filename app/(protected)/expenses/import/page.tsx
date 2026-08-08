"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { Category, ImportedTransaction } from "@/lib/types";
import { formatCents } from "@/lib/money";

type Row = ImportedTransaction & { include: boolean };

export default function ImportStatementPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setDone(null);
    setRows([]);
    setParsing(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/expenses/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not read that statement");
      } else {
        setCategories(data.categories);
        const newRows: Row[] = data.transactions.map((t: ImportedTransaction) => ({
          ...t,
          include: t.transactionType === "debit",
        }));
        if (newRows.length === 0) {
          setError("No transactions were found in that file — try a clearer scan or a different file.");
        }
        setRows(newRows);
      }
    } catch {
      setError("Something went wrong reading that file");
    } finally {
      setParsing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const includedRows = rows.filter((r) => r.include);
  const includedTotal = includedRows.reduce((sum, r) => sum + Math.round(r.amount * 100), 0);

  async function handleConfirm() {
    if (includedRows.length === 0) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/expenses/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expenses: includedRows.map((r) => ({
          amount: Math.round(r.amount * 100),
          categoryId: r.categoryId,
          description: r.description,
          date: r.date,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setDone(data.created);
      setRows([]);
      setFileName(null);
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not save these expenses");
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Import Statement</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Upload a bank or credit card statement (PDF or a clear photo) and let AI pull out the
        transactions for you. Nothing is saved anywhere — the file is read once to extract the
        line items below, then discarded. Review and adjust anything before it&apos;s added to
        your expenses; nothing is logged until you confirm.
      </p>

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-rule bg-surface p-8 text-center shadow-sm">
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="statement-file"
          />
          <label
            htmlFor="statement-file"
            className="inline-block cursor-pointer rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-deep"
          >
            {parsing ? "Reading statement…" : "Choose a file"}
          </label>
          <p className="mt-3 text-xs text-ink-soft">PDF, PNG, or JPG — up to 15MB</p>
          {fileName && !parsing && !error && (
            <p className="mt-2 text-xs text-ink-soft">{fileName}</p>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-rose">{error}</p>}

      {done !== null && (
        <p className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-ink">
          Added {done} expense{done === 1 ? "" : "s"} to your dashboard.
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-2">
          <p className="mb-3 text-sm text-ink-soft">
            Found {rows.length} transaction{rows.length === 1 ? "" : "s"}. Debits are checked by
            default — uncheck anything that isn&apos;t really an expense (payments, refunds,
            credits), then fix up dates, descriptions, amounts, or categories as needed.
          </p>
          <div className="overflow-x-auto rounded-xl border border-rule bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-3 py-3"></th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((r, i) => (
                  <tr key={i} className={r.include ? "" : "opacity-40"}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => updateRow(i, { include: e.target.checked })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={r.date}
                        onChange={(e) => updateRow(i, { date: e.target.value })}
                        className="w-32 rounded-lg border border-rule px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={r.description}
                        onChange={(e) => updateRow(i, { description: e.target.value })}
                        className="w-56 rounded-lg border border-rule px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={r.categoryId ?? ""}
                        onChange={(e) => updateRow(i, { categoryId: e.target.value })}
                        className="rounded-lg border border-rule px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={r.amount}
                        onChange={(e) => updateRow(i, { amount: parseFloat(e.target.value) || 0 })}
                        className="w-24 rounded-lg border border-rule px-2 py-1.5 text-right text-sm focus:border-accent focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-ink-soft">
              {includedRows.length} selected · total {formatCents(includedTotal)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRows([]);
                  setFileName(null);
                  setError(null);
                }}
                className="rounded-lg border border-rule px-4 py-2 text-sm font-medium text-ink-soft hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || includedRows.length === 0}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep disabled:opacity-50"
              >
                {saving ? "Adding…" : `Add ${includedRows.length} Expense${includedRows.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
