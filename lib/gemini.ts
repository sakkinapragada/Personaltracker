import { ApiError, GoogleGenAI, Type, type GenerateContentParameters } from "@google/genai";

// Pinned rather than "-latest": the rolling alias can shift onto a newly
// released model before Google has provisioned capacity for it, which
// showed up as sustained 503s in practice.
const GEMINI_MODEL = "gemini-3.1-flash-lite";

// Each attempt itself can take 10s+ under real congestion (observed
// directly against the live API), so this stays short: one retry, not
// several — stacking more risks running past the caller's own request
// timeout (see `maxDuration` on the API routes that call into this file).
const RETRY_DELAYS_MS = [1000];

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "missing_api_key" });
  }
  return client;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithRetry(
  params: GenerateContentParameters,
): ReturnType<GoogleGenAI["models"]["generateContent"]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getClient().models.generateContent(params);
    } catch (e) {
      const retryable = e instanceof ApiError && (e.status === 503 || e.status === 429);
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw e;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

export async function summarize(prompt: string): Promise<string> {
  const response = await generateContentWithRetry({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return (response.text ?? "").trim();
}

export type ExtractedTransaction = {
  date: string;
  description: string;
  amount: number;
  category: string;
  transactionType: "debit" | "credit";
};

const TRANSACTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: "Transaction date in YYYY-MM-DD format" },
      description: { type: Type.STRING, description: "Merchant or transaction description as printed on the statement" },
      amount: { type: Type.NUMBER, description: "Transaction amount in dollars, always positive" },
      category: { type: Type.STRING, description: 'Best-matching category name from the provided list, or "Other" if none fit' },
      transactionType: {
        type: Type.STRING,
        enum: ["debit", "credit"],
        description: '"debit" for a purchase/charge/fee (money spent), "credit" for a payment, refund, or deposit',
      },
    },
    required: ["date", "description", "amount", "transactionType"],
  },
};

export async function extractTransactionsFromDocument(
  base64Data: string,
  mimeType: string,
  categoryNames: string[],
): Promise<ExtractedTransaction[]> {
  if (!process.env.GEMINI_API_KEY) return [];

  const prompt = `You are reading a bank or credit card statement. Extract every individual transaction line item you can find.

For each transaction, provide:
- date: the transaction date, formatted as YYYY-MM-DD (infer the year from the statement period if it isn't printed on the line itself)
- description: the merchant or transaction description as printed
- amount: the dollar amount as a positive number
- transactionType: "debit" if it's a purchase, charge, or fee (money spent), "credit" if it's a payment, refund, or deposit
- category: pick the single best match from this list of existing categories: ${categoryNames.join(", ")}. If nothing fits well, use "Other".

Only extract actual transaction line items — skip summary totals, running balances, and headers. Return an empty array if you can't find any transactions.`;

  try {
    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }],
      config: {
        responseMimeType: "application/json",
        responseSchema: TRANSACTION_SCHEMA,
      },
    });

    const text = (response.text ?? "").trim();
    if (!text) return [];

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is ExtractedTransaction =>
        !!t &&
        typeof t.date === "string" &&
        typeof t.description === "string" &&
        typeof t.amount === "number",
    );
  } catch {
    return [];
  }
}

export type ExpenseInsight = {
  patternSummary: string;
  nudges: string[];
};

const INSIGHT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    patternSummary: {
      type: Type.STRING,
      description:
        "3-4 bullet points, one per line, each starting with \"- \" and no other markdown. Each bullet should be specific and detailed (exact dollar amounts, category names, and comparisons to last month), not vague generalities.",
    },
    nudges: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 short, concrete, encouraging suggestions for saving money this month",
    },
  },
  required: ["patternSummary", "nudges"],
};

type MonthForPrompt = {
  label: string;
  total: number; // dollars
  byCategory: { name: string; total: number }[];
};

export async function generateExpenseInsights(
  current: MonthForPrompt,
  previous: MonthForPrompt,
  daysElapsed: number,
  daysInMonth: number,
  monthlyBudget: number | null, // dollars
): Promise<ExpenseInsight | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const categoryLines = (m: MonthForPrompt) =>
    m.byCategory.length ? m.byCategory.map((c) => `${c.name}: ${fmt(c.total)}`).join(", ") : "no expenses logged";
  const pace = daysElapsed > 0 ? (current.total / daysElapsed) * daysInMonth : 0;

  const prompt = `You are a calm, encouraging personal finance assistant looking at one person's expense data.

${current.label} so far (day ${daysElapsed} of ${daysInMonth}): total ${fmt(current.total)}. By category: ${categoryLines(current)}.
${previous.label} (complete month): total ${fmt(previous.total)}. By category: ${categoryLines(previous)}.
Projected pace for ${current.label} if the rest of the month continues at the same daily rate: ${fmt(pace)}.
${monthlyBudget !== null ? `Their monthly budget goal is ${fmt(monthlyBudget)}.` : "They have not set a monthly budget goal."}

Write:
- patternSummary: 3-4 bullet points, one per line, each starting with "- " and no other markdown. Call out the specific categories that moved the most, with exact dollar amounts and the comparison to last month. Be detailed and concrete — no vague generalities.
- nudges: 2-3 short, specific, encouraging suggestions for saving money this month. ${monthlyBudget !== null ? "Reference their budget goal and projected pace directly where relevant (e.g. how far over or under pace they are)." : "Keep suggestions general since no budget goal is set."} No guilt-tripping and no generic advice like "track your spending" — be concrete about which category or habit to look at.`;

  try {
    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: INSIGHT_SCHEMA,
      },
    });

    const text = (response.text ?? "").trim();
    if (!text) return null;

    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed.patternSummary !== "string" || !Array.isArray(parsed.nudges)) return null;
    return {
      patternSummary: parsed.patternSummary,
      nudges: parsed.nudges.filter((n: unknown): n is string => typeof n === "string"),
    };
  } catch {
    return null;
  }
}
