export type Category = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
};

export type Expense = {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  categoryId: string;
  category: Category;
};

export type Recurrence = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type ReminderCategory = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
};

export type Reminder = {
  id: string;
  title: string;
  notes: string | null;
  date: string;
  recurrence: Recurrence;
  isActive: boolean;
  categoryId: string;
  category: ReminderCategory;
};

export type StockQuote = {
  price: number;
  change: number | null;
  changePercent: number | null;
  high: number;
  low: number;
  open: number;
  previousClose: number;
};

export type Stock = {
  id: string;
  symbol: string;
  name: string | null;
  shares: number | null;
  avgCost: number | null;
  quote: StockQuote | null;
};

export type StockNewsArticle = {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
};

export type StockNewsGroup = {
  symbol: string;
  name: string | null;
  changePercent: number | null;
  summary: string;
  articles: StockNewsArticle[];
};

export type EarningsInfo = {
  symbol: string;
  name: string | null;
  date: string | null;
  hour: string | null;
  quarter: number | null;
  year: number | null;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  reminderAdded: boolean;
};

export type EarningsRecap = {
  symbol: string;
  name: string | null;
  date: string;
  quarter: number;
  year: number;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  summary: string;
};
