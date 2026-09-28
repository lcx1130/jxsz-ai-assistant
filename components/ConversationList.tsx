"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { makeUserId } from "../lib/chat-user";

type Conversation = { id: string; name: string; updatedAt: number };
export default function ConversationList({ activeId = "", compact = false, disabled = false }: { activeId?: string; compact?: boolean; disabled?: boolean }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  async function load(next?: string, signal?: AbortSignal) {
    setBusy(true); setError("");
    try {
      const params = new URLSearchParams({ user: makeUserId(), ...(next ? { cursor: next } : {}) });
      const response = await fetch(`/api/history?${params}`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(old => next ? [...old, ...data.data.filter((item: Conversation) => !old.some(existing => existing.id === item.id))] : data.data);
      setCursor(data.cursor); setHasMore(data.hasMore);
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "加载失败"); }
    finally { if (!signal?.aborted) setBusy(false); }
  }
  useEffect(() => { const controller = new AbortController(); void load(undefined, controller.signal); return () => controller.abort(); }, [activeId]);
  return <div className={compact ? "sidebar-history" : "history-list"}>
    {error && <div role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => load()}>重试</button></div>}
    {!busy && !error && !items.length && <p>还没有对话记录，开始咨询后会自动出现在这里。</p>}
    {items.map(item => <Link aria-disabled={disabled} onClick={e => { if (disabled) e.preventDefault(); }} className={`history-item ${item.id === activeId ? "selected" : ""}`} key={item.id} href={`/chat?conversation=${encodeURIComponent(item.id)}`}>
      <strong>{item.name}</strong><span>{new Date(item.updatedAt * 1000).toLocaleString("zh-CN")}</span>
    </Link>)}
    {busy && <p role="status">正在加载对话记录…</p>}
    {hasMore && !compact && <button className="button button-secondary" disabled={busy} onClick={() => load(cursor)}>加载更多</button>}
    {compact && <Link href="/history" className="human-back">查看全部历史对话 →</Link>}
  </div>;
}
