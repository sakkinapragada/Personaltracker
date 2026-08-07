export type AppDef = {
  slug: string;
  name: string;
  description: string;
  href: string;
  color: string;
  soft: string;
};

// Add a new entry here to register another tracker in the launcher.
// Pair it with an icon in components/icons.tsx and the ICONS map in
// app/(protected)/apps/page.tsx.
export const APPS: AppDef[] = [
  {
    slug: "expenses",
    name: "Expense Tracker",
    description: "Track monthly expenses, categories, and trends.",
    href: "/expenses",
    color: "#6b4e71",
    soft: "#ece3ee",
  },
  {
    slug: "reminders",
    name: "Reminders",
    description: "Recurring reminders, categorized, emailed to you daily.",
    href: "/reminders",
    color: "#4f7c6b",
    soft: "#e3ece8",
  },
  {
    slug: "stocks",
    name: "Stock Tracker",
    description: "Watch prices, track your portfolio, and catch market-moving news.",
    href: "/stocks",
    color: "#4f7c96",
    soft: "#e7ecf0",
  },
];
