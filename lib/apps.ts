export type AppDef = {
  slug: string;
  name: string;
  description: string;
  href: string;
  color: string;
  soft: string;
  mark: string;
};

// Add a new entry here to register another tracker in the launcher.
export const APPS: AppDef[] = [
  {
    slug: "expenses",
    name: "Expense Tracker",
    description: "Track monthly expenses, categories, and trends.",
    href: "/expenses",
    color: "#6b4e71",
    soft: "#ece3ee",
    mark: "E",
  },
  {
    slug: "reminders",
    name: "Reminders",
    description: "Recurring reminders, categorized, emailed to you daily.",
    href: "/reminders",
    color: "#4f7c6b",
    soft: "#e3ece8",
    mark: "R",
  },
  {
    slug: "stocks",
    name: "Stock Tracker",
    description: "Watch prices, track your portfolio, and catch market-moving news.",
    href: "/stocks",
    color: "#4f7c96",
    soft: "#e7ecf0",
    mark: "S",
  },
];
