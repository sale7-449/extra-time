import type { SVGProps } from "react";

/**
 * أيقونات خطية بسيطة (Line Icons) — بلا مكتبة خارجية، بحجم بندل أخف.
 * الأيقونات الاتجاهية (مثل زر الرجوع) مبنية خصيصاً لتتوافق مع RTL، لا مقلوبة تلقائياً.
 */

type IconProps = SVGProps<SVGSVGElement>;
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

export function MatchesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5 15.5 10l-1.3 4H9.8L8.5 10 12 7.5Z" />
    </svg>
  );
}

export function NewsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M7.5 8.5h6M7.5 12h9M7.5 15.5h9" />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4v1a4 4 0 0 0 4 4M17 5h3v1a4 4 0 0 1-4 4" />
      <path d="M12 13v3M9 20h6M9.5 20c0-2 .8-3 2.5-3s2.5 1 2.5 3" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function BackIcon(props: IconProps) {
  // في RTL: "رجوع" يشير إلى اليمين — سهم مقصود لا مقلوب عرضياً بالخطأ
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="17" cy="6" r="2.5" />
      <circle cx="17" cy="18" r="2.5" />
      <path d="M8.2 10.8 14.8 7.2M8.2 13.2l6.6 3.6" />
    </svg>
  );
}

export function FireIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1.5-1-2-1-3.5 1.5 1 3 3.2 3 5.5a5 5 0 0 1-10 0C7 8 10 6 12 3Z" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 4c4.4 0 8 3 8 7s-3.6 7-8 7c-.9 0-1.7-.1-2.5-.3L5 20l1.3-3.6C4.9 15 4 13.1 4 11c0-4 3.6-7 8-7Z" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9L12 3.5Z" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 3.2 5 6v5.5c0 4.3 2.9 7.8 7 9.3 4.1-1.5 7-5 7-9.3V6l-7-2.8Z" />
      <path d="m9 12 2.2 2.2L15.2 10" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function GhostIcon(props: IconProps) {
  // إشارة سناب شات مبسّطة كخط عام — ليس الشعار الرسمي
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 4c3 0 5 2.4 5 5.5 0 1.8.4 3 1.2 4-1 .6-2 .8-2 .8.3.9 1.3 1.7 1.3 1.7-1 .6-2.1.7-2.7.7-.3.9-1.4 1.8-2.8 1.8s-2.5-.9-2.8-1.8c-.6 0-1.7-.1-2.7-.7 0 0 1-.8 1.3-1.7 0 0-1-.2-2-.8.8-1 1.2-2.2 1.2-4C7 6.4 9 4 12 4Z" />
    </svg>
  );
}
