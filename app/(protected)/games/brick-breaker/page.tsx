"use client";

import dynamic from "next/dynamic";

const BrickBreakerGame = dynamic(
  () => import("@/components/games/BrickBreakerGame").then((m) => m.BrickBreakerGame),
  { ssr: false },
);

export default function BrickBreakerPage() {
  return <BrickBreakerGame />;
}
