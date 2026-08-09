"use client";

import dynamic from "next/dynamic";

const BlockStackGame = dynamic(
  () => import("@/components/games/BlockStackGame").then((m) => m.BlockStackGame),
  { ssr: false },
);

export default function BlockStackPage() {
  return <BlockStackGame />;
}
