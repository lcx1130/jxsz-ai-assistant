import type { CSSProperties } from "react";
export type IconName = "home" | "book" | "help" | "history" | "chat" | "source" | "headset" | "send" | "bed" | "card" | "box" | "check" | "food";
const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  book: <><path d="M12 5v16M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z" /></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2M12 17h.01"/></>,
  history: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2"/></>,
  chat: <path d="M21 11a8 8 0 0 1-8 8H8l-5 3V7a4 4 0 0 1 4-4h6a8 8 0 0 1 8 8Z"/>,
  source: <><path d="M14 3H5v18h14V8ZM14 3v5h5M8 12h8m-8 4h5"/></>,
  headset: <><path d="M4 13V11a8 8 0 0 1 16 0v6a4 4 0 0 1-4 4h-4"/><rect x="3" y="11" width="4" height="7" rx="2"/><rect x="17" y="11" width="4" height="7" rx="2"/></>,
  send: <><path d="m3 3 19 9-19 9 4-9Zm4 9h15"/></>,
  bed: <><path d="M3 5v16m18-12v12M3 17h18M3 9h18v8M7 9V6h5v3"/></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></>,
  box: <><path d="m12 3 9 5v9l-9 5-9-5V8Zm-9 5 9 5 9-5M12 13v9M7.5 5.5l9 5"/></>,
  check: <><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 4V2h6v2M8 12l3 3 5-6"/></>,
  food: <><path d="M5 3v7m3-7v7m3-7v7M5 7h6M8 10v11M19 3c-3 2-4 5-4 9h4m0-9v18"/></>,
};
export default function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ui-icon" style={style}>{paths[name]}</svg>;
}
