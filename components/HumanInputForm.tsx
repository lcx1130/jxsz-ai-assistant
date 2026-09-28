"use client";

import { useEffect, useRef, useState } from "react";
import type { HumanForm } from "../lib/dify";

export default function HumanInputForm({ form, workflowRunId, user, onResult }: {
  form: HumanForm; workflowRunId: string; user: string;
  onResult: (result: { answer?: string; humanForm?: HumanForm; workflowRunId?: string; status?: string }) => void;
}) {
  const awaitingStaff = form.awaitingStaff || !form.form_token || form.inputs?.some(input => input.output_variable_name !== "service_issue");
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const [values, setValues] = useState<Record<string, string>>(form.resolved_default_values || {});
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const expired = !!form.expiration_time && form.expiration_time * 1000 < Date.now();
  const supported = form.inputs?.every(input => input.type === "paragraph");
  useEffect(() => {
    if (!awaitingStaff) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    async function check() {
      if (stopped) return;
      if (document.visibilityState === "hidden") { timer = setTimeout(check, 5000); return; }
      controller = new AbortController();
      let finished = false;
      try {
        const response = await fetch("/api/human", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ operation: "resume", workflowRunId, user }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (stopped) return;
        setError("");
        if (result.status !== "paused") { finished = true; onResultRef.current(result); }
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : "同步暂时中断，正在重试…");
      } finally {
        if (!stopped && !finished) timer = setTimeout(check, 5000);
      }
    }
    void check();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [awaitingStaff, workflowRunId, user]);

  async function resume() {
    const response = await fetch("/api/human", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "resume", workflowRunId, user }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    onResult(result);
  }
  async function submit(action: string) {
    setBusy(true); setError("");
    try {
      if (!submitted) {
        const response = await fetch("/api/human", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formToken: form.form_token, action, inputs: values, user }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setSubmitted(true);
      }
      await resume();
    } catch (e) { setError(e instanceof Error ? e.message : "请求失败"); }
    finally { setBusy(false); }
  }
  if (awaitingStaff) return (
    <section className="human-input-card" aria-label="等待工作人员回复">
      <h3>等待工作人员回复</h3>
      <p role="status">问题已提交。工作人员处理完成后，回复会自动显示在这里。</p>
      <p>你无需填写工作人员的处理结果。</p>
      {error && <p className="error-box" role="alert">{error} 正在自动重试。</p>}
    </section>
  );
  return (
    <section className="human-input-card" aria-label={form.node_title || "人工服务表单"}>
      <h3>{form.node_title || "人工服务表单"}</h3>
      <p className="human-form-description">{form.form_content.replace(/\{\{#\$output\.[^#]+#\}\}/g, "").trim()}</p>
      {submitted ? <p role="status">表单已提交。{busy ? "正在获取后续结果…" : "可检查流程的后续结果。"}</p> : (
        <>
          {form.inputs?.map(input => input.type === "paragraph" && (
            <label className="human-field" key={input.output_variable_name}>
              {input.output_variable_name === "service_issue" ? "请描述你遇到的问题" : input.output_variable_name}
              <textarea rows={4} value={values[input.output_variable_name] || ""} disabled={busy || expired}
                onChange={event => setValues(previous => ({ ...previous, [input.output_variable_name]: event.target.value }))} />
            </label>
          ))}
          {expired && <p role="alert">表单已过期，请新建对话后重新申请人工服务。</p>}
          {!supported && <p role="alert">此表单包含暂不支持的字段，请在 Dify 中继续处理。</p>}
          {!form.form_token && <p role="status">此步骤需要由指定工作人员在 Dify 中处理。</p>}
        </>
      )}
      {error && <p className="error-box" role="alert">{error}</p>}
      {submitted ? <button className="button button-secondary" disabled={busy} onClick={() => submit("")}>检查后续结果</button> : (
        <div className="human-form-actions">{form.actions?.map(action => <button key={action.id} className="button button-primary" disabled={busy || expired || !supported || !form.form_token || form.inputs.some(input => !values[input.output_variable_name]?.trim())} onClick={() => submit(action.id)}>{busy ? "提交中…" : action.title}</button>)}</div>
      )}
    </section>
  );
}
