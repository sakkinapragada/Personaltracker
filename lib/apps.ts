export type AppDef = {
  slug: string;
  name: string;
  description: string;
  href: string;
  color: string;
  icon: string;
};

// Add a new entry here to register another tracker in the launcher.
export const APPS: AppDef[] = [
  {
    slug: "expenses",
    name: "Expense Tracker",
    description: "Track monthly expenses, categories, and trends.",
    href: "/expenses",
    color: "#10b981",
    icon: "💰",
  },
  {
    slug: "reminders",
    name: "Reminders",
    description: "Recurring reminders, categorized, emailed to you daily.",
    href: "/reminders",
    color: "#f59e0b",
    icon: "⏰",
  },
  {
    slug: "stocks",
    name: "Stock Tracker",
    description: "Watch prices, track your portfolio, and catch market-moving news.",
    href: "/stocks",
    color: "#0ea5e9",
    icon: "📈",
  },
];
