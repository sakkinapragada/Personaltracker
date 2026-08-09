import { BlockStackGame } from "@/components/games/BlockStackGame";

export default function BlockStackPage() {
  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Block Stack</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Clear lines to level up. Survive the speed — and after level 5, the chaos.
      </p>
      <BlockStackGame />
    </div>
  );
}
