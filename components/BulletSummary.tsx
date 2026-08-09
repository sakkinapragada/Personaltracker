function toBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function BulletSummary({ text, className }: { text: string; className?: string }) {
  const bullets = toBullets(text);

  if (bullets.length <= 1) {
    return <p className={className ?? "text-sm text-ink"}>{text}</p>;
  }

  return (
    <ul className={className ?? "space-y-1.5 text-sm text-ink"}>
      {bullets.map((bullet, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-0.5 text-ink-faint">•</span>
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}
