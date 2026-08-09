export type GameDef = {
  slug: string;
  name: string;
  description: string;
  href: string;
  color: string;
  soft: string;
};

// Add a new entry here to register another game in the Games hub.
export const GAMES: GameDef[] = [
  {
    slug: "block-stack",
    name: "Block Stack",
    description: "A classic falling-block puzzle game. Clear lines, level up, and try to survive.",
    href: "/games/block-stack",
    color: "#c23b8c",
    soft: "#f8e3f0",
  },
];
