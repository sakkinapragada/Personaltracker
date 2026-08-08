import type { CSSProperties } from "react";
type IconProps = { className?: string; style?: CSSProperties };

export function BanknoteIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01" />
      <path d="M18 12h.01" />
    </svg>
  );
}

export function BellIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M12 4a5 5 0 0 0-5 5v3.5c0 .7-.28 1.37-.78 1.87L5 15.5A1 1 0 0 0 5.7 17h12.6a1 1 0 0 0 .7-1.7l-1.22-1.13c-.5-.5-.78-1.17-.78-1.87V9a5 5 0 0 0-5-5Z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function EyeIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
      <path d="M9.88 5.09A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-2.09 2.91M6.1 6.1C3.86 7.65 2 12 2 12a13.15 13.15 0 0 0 5.88 5.9M12 19c-.5 0-1-.03-1.47-.09" />
    </svg>
  );
}

export function NoteIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M5 3.5h14a1 1 0 0 1 1 1V16l-5 5H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M20 16h-4a1 1 0 0 0-1 1v4" />
      <path d="M7.5 8h9" />
      <path d="M7.5 11.5h9" />
      <path d="M7.5 15h5" />
    </svg>
  );
}

export function NewsIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M8.3 8.3a5.2 5.2 0 0 1 7.4 7.4" />
      <path d="M5.2 5.2a9.6 9.6 0 0 1 13.6 13.6" />
    </svg>
  );
}

export function TrendingUpIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}
