import Link from "next/link";
import { GAMES } from "@/lib/games";
import { GamepadIcon } from "@/components/icons";

export default function GamesPage() {
  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Games</h1>
      <p className="mb-6 text-sm text-ink-soft">Take a short break — pick a game to play.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GAMES.map((game) => (
          <Link
            key={game.slug}
            href={game.href}
            className="group flex items-center gap-4 rounded-2xl border border-rule bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-105"
              style={{ backgroundColor: game.soft }}
            >
              <GamepadIcon className="h-7 w-7" style={{ color: game.color }} />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{game.name}</p>
              <p className="mt-1 text-xs leading-snug text-ink-soft">{game.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
