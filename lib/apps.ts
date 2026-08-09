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
    color: "#5e4b96",
    soft: "#ece8f5",
  },
  {
    slug: "reminders",
    name: "Reminders",
    description: "Recurring reminders, categorized, emailed to you daily.",
    href: "/reminders",
    color: "#1f8a63",
    soft: "#e2f3ec",
  },
  {
    slug: "stocks",
    name: "Stock Tracker",
    description: "Watch prices, track your portfolio, and catch market-moving news.",
    href: "/stocks",
    color: "#256ca8",
    soft: "#e5eef7",
  },
  {
    slug: "notes",
    name: "Notes",
    description: "Quick daily notes and to-do lists, autosaved as you type.",
    href: "/notes",
    color: "#a3701a",
    soft: "#f6ecdb",
  },
  {
    slug: "news",
    name: "News Tracker",
    description: "Follow topics and categories, with AI summaries of what's happening.",
    href: "/news",
    color: "#b5502e",
    soft: "#f7e6dd",
  },
];
