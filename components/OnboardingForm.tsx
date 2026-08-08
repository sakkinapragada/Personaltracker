"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { NEWS_COUNTRIES } from "@/lib/newsCountries";

export function OnboardingForm({
  defaultName,
  defaultBudget,
  defaultCountry,
}: {
  defaultName: string;
  defaultBudget: number | null;
  defaultCountry: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [budget, setBudget] = useState(defaultBudget !== null ? (defaultBudget / 100).toString() : "");
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(monthlyBudget: number | null) {
    if (!name.trim()) {
      setError("Enter a name so we know what to call you");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredName: name.trim(), monthlyBudget, newsCountry: country || null }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/apps");
    } else {
      setError("Could not save your preferences — try again");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(budget);
    submit(budget.trim() && !Number.isNaN(parsed) && parsed > 0 ? Math.round(parsed * 100) : null);
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-rule bg-surface p-8 shadow-md">
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Welcome</h1>
      <p className="mb-6 text-sm text-ink-soft">
        A few quick things so the app feels like yours — you can change any of this later in
        Settings.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">What should we call you?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
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
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 2000"
            className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-ink-soft">
            Set this and your Expense Insights will tell you how you&apos;re pacing against it.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            News country <span className="text-ink-faint">(optional)</span>
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
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

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(null)}
            className="text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-deep disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
