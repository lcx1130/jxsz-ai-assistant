"use client";

import { useEffect, useRef, useState } from "react";
import type { HumanForm } from "../lib/dify";

type Result = { answer?: string; humanForm?: HumanForm; workflowRunId?: string; status?: string; sources?: { documentName?: string; datasetName?: string; content?: string; score?: number }[] };

export default function RunProgress({ workflowRunId, onResult }: { workflowRunId: string; onResult: (result: Result) => void }) {
  const callback = useRef(onResult);
  callback.current = onResult;
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    const started = Date.now();
    async function check() {
      if (stopped) return;
      if (Date.now() - started > 10 * 60 * 1000) { setError("这次查询耗时较长。可以继续等待获取结果。"); return; }
      if (document.visibilityState === "hidden") { timer = setTimeout(check, 5000); return; }
      controller = new AbortController();
      try {
        const response = await fetch("/api/human", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ operation: "resume", workflowRunId }) });
        const result = await response.json();
        if (!response.ok) throw new Error("同步暂时中断，正在继续获取查询结果。");
        if (stopped) return;
        setError("");
        if (result.status !== "running") { callback.current(result); return; }
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : "同步暂时中断，正在继续获取查询结果。");
      }
      if (!stopped) timer = setTimeout(check, 5000);
    }
    void check();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [workflowRunId, attempt]);
  return <section role="status">
    <p>正在查询并整理资料，完成后会自动显示结果。无需重复提交问题。</p>
    {error && <><p>{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>继续等待</button></>}
  </section>;
}
