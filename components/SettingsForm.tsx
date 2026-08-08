"use client";

import { useState, type FormEvent } from "react";
import { NEWS_COUNTRIES } from "@/lib/newsCountries";

export function SettingsForm({
  defaultName,
  defaultBudget,
  defaultCountry,
}: {
  defaultName: string;
  defaultBudget: number | null;
  defaultCountry: string | null;
}) {
  const [name, setName] = useState(defaultName);
  const [budget, setBudget] = useState(defaultBudget !== null ? (defaultBudget / 100).toString() : "");
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a name so we know what to call you");
      return;
    }
    const parsed = parseFloat(budget);
    const monthlyBudget = budget.trim() && !Number.isNaN(parsed) && parsed > 0 ? Math.round(parsed * 100) : null;

    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredName: name.trim(), monthlyBudget, newsCountry: country || null }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
    } else {
      setError("Could not save your preferences — try again");
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-rule bg-surface p-8 shadow-md">
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Settings</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Your name, monthly budget goal, and news country — used for greetings, Expense Insights,
        and the News Tracker.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">What should we call you?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            placeholder="Your name"
            className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            Monthly budget goal <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={budget}
            onChange={(e) => {
              setBudget(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. 2000"
            className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-ink-soft">
            Leave blank to remove your budget goal — Insights will show pattern observations
            without pace-against-goal nudges.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            News country <span className="text-ink-faint">(optional)</span>
          </label>
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            <option value="">No preference</option>
            {NEWS_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-soft">
            Your News Tracker will focus on this country&apos;s coverage.
          </p>
        </div>

        {error && <p className="text-sm text-rose">{error}</p>}
        {saved && !error && <p className="text-sm text-accent">Saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-deep disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
