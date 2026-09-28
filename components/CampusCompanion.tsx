"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

type Point = { x: number; y: number };
export default function CampusCompanion() {
  const [position, setPosition] = useState<Point | null>(null);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [message, setMessage] = useState("你好，我是小晨学长！点我互动，也可以拖着我换个位置。");
  const [motion, setMotion] = useState("");
  const [frame, setFrame] = useState(0);
  const [actionsReady, setActionsReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const drag = useRef<{ start: Point; origin: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clamp = (p: Point) => {
    const box = root.current?.getBoundingClientRect();
    return { x: Math.max(8, Math.min(p.x, window.innerWidth - (box?.width ?? 128) - 8)), y: Math.max(80, Math.min(p.y, window.innerHeight - (box?.height ?? 210) - 8)) };
  };
  useEffect(() => {
    const resize = () => setPosition(p => p ? clamp(p) : null);
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); if (timer.current) clearTimeout(timer.current); };
  }, []);
  useLayoutEffect(() => {
    if (!open || collapsed) return;
    function placePanel() {
      if (!root.current || !panel.current) return;
      const character = root.current.getBoundingClientRect();
      const width = panel.current.getBoundingClientRect().width;
      const margin = 8, gap = 16;
      const viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
      const fit = (value: number, size: number, extent: number) => Math.max(margin, Math.min(value, extent - size - margin));
      const naturalHeight = panel.current.scrollHeight + 2;
      let left: number, top: number, maxHeight = viewportHeight - margin * 2;
      // Keep a separate rectangle for the menu, including after dragging or resizing.
      if (character.left - gap - width >= margin) {
        left = character.left - gap - width;
        top = fit(character.top, Math.min(naturalHeight, maxHeight), viewportHeight);
      } else if (character.right + gap + width <= viewportWidth - margin) {
        left = character.right + gap;
        top = fit(character.top, Math.min(naturalHeight, maxHeight), viewportHeight);
      } else {
        left = fit(character.left + character.width / 2 - width / 2, width, viewportWidth);
        const above = Math.max(0, character.top - gap - margin);
        const below = Math.max(0, viewportHeight - character.bottom - gap - margin);
        const useAbove = above >= below;
        maxHeight = useAbove ? above : below;
        top = useAbove ? character.top - gap - Math.min(naturalHeight, maxHeight) : character.bottom + gap;
      }
      setPanelStyle({ left, top, maxHeight, visibility: "visible" });
    }
    placePanel();
    const observer = new ResizeObserver(placePanel);
    observer.observe(root.current!);
    observer.observe(panel.current!);
    window.addEventListener("resize", placePanel);
    return () => { observer.disconnect(); window.removeEventListener("resize", placePanel); };
  }, [open, collapsed, position, message]);

  function animate(kind: string, text: string) {
    if (!actionsReady) return;
    if (timer.current) clearTimeout(timer.current);
    setMotion(kind); setMessage(kind === "highfive" ? "来，抬起手——和学长击个掌！" : text); setOpen(true);
    // Hold distinct anticipation, contact and recovery poses instead of moving a static picture.
    const sequences: Record<string, [number, number][]> = {
      highfive: [[0, 150], [1, 300], [2, 220], [3, 650], [2, 180], [1, 200], [0, 150]],
      wave: [[1, 220], [4, 250], [1, 180], [4, 250], [1, 180], [4, 250], [1, 220], [0, 150]],
      jump: [[0, 150], [6, 320], [7, 600], [6, 200], [0, 200]],
    };
    const sequence = sequences[kind] ?? sequences.wave;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setFrame(kind === "highfive" ? 3 : kind === "jump" ? 7 : 1); setMessage(text);
      timer.current = setTimeout(() => { setFrame(0); setMotion(""); }, 1200);
      return;
    }
    function play(index: number) {
      if (index >= sequence.length) { setFrame(0); setMotion(""); return; }
      const [pose, duration] = sequence[index];
      setFrame(pose);
      if (kind === "highfive" && pose === 3) setMessage(text);
      timer.current = setTimeout(() => play(index + 1), duration);
    }
    play(0);
  }
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const box = root.current!.getBoundingClientRect();
    drag.current = { start: { x: event.clientX, y: event.clientY }, origin: { x: box.left, y: box.top }, moved: false };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.start.x, dy = event.clientY - state.start.y;
    if (Math.hypot(dx, dy) > 6) state.moved = true;
    if (state.moved) { setDragging(true); setOpen(false); setPosition(clamp({ x: state.origin.x + dx, y: state.origin.y + dy })); }
  }
  function stop() { suppressClick.current = drag.current?.moved ?? false; drag.current = null; setDragging(false); }
  if (collapsed) return <button className="companion-restore" onClick={() => { setCollapsed(false); setPosition(null); }} aria-label="展开小晨学长">小晨学长 <span aria-hidden="true">✦</span></button>;
  return <div ref={root} className={`campus-companion ${dragging ? "is-dragging" : ""}`} style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}>
    {open && <section className="companion-panel" aria-label="小晨学长互动" ref={panel} style={panelStyle}>
      <div className="companion-panel-heading"><strong>小晨学长 <small>校园陪伴员</small></strong><button aria-label="关闭互动菜单" onClick={() => setOpen(false)}>×</button></div>
      <p aria-live="polite">{message}</p>
      <div className="companion-actions">
        <button disabled={!actionsReady} onClick={() => animate("wave", "嗨！很高兴认识你，欢迎来到师专！")}>👋 打个招呼</button>
        <button disabled={!actionsReady} onClick={() => animate("jump", "耶！为你的新生活加油！✨")}>✨ 开心一下</button>
        <button disabled={!actionsReady} onClick={() => animate("highfive", "击掌成功！今天也要元气满满！🙌")}>🙌 和我击掌</button>
        <Link href="/#guide" onClick={() => setOpen(false)}>📖 新生指南</Link>
      </div>
      <Link className="companion-consult" href="/chat" onClick={() => setOpen(false)}>有问题？开始咨询 →</Link>
    </section>}
    <button className="companion-minimize" aria-label="收起小晨学长" title="收起" onClick={() => { setCollapsed(true); setOpen(false); }}>−</button>
    <button className={`companion-character action-${motion}`} aria-label="小晨学长，点击互动，拖动移动" aria-expanded={open} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={() => { drag.current = null; setDragging(false); }} onClick={() => { if (!suppressClick.current) setOpen(v => !v); suppressClick.current = false; }} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
      <img ref={image => { if (image?.complete && image.naturalWidth > 0) setActionsReady(true); }} className="companion-sheet-loader" src="/images/xiaochen-actions.png" alt="" onLoad={() => setActionsReady(true)} />
      {actionsReady ? <span className="companion-sprite" role="img" aria-label="小晨学长互动人物" data-pose={frame} style={{ backgroundPosition: `${(frame % 4) * 100 / 3}% ${frame < 4 ? 0 : 100}%` }} /> : <img src="/images/xiaochen-companion.png" alt="小晨学长" draggable={false} width={128} height={192} />}
      {motion === "highfive" && frame === 3 && <span className="companion-contact" aria-hidden="true">✦ 啪！</span>}
    </button>
    <span className="companion-name">小晨学长 <span>点我互动</span></span>
  </div>;
}
