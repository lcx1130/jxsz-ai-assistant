export type HumanForm = {
  form_token?: string;
  node_title?: string;
  awaitingStaff?: boolean;
  kind?: "issue" | "feedback";
  form_content: string;
  inputs: { output_variable_name: string; type: string }[];
  actions: { id: string; title: string }[];
  user_actions?: { id: string; title: string }[];
  resolved_default_values?: Record<string, string>;
  expiration_time?: number;
};

// Recognize only the two student-facing forms in this project. Staff forms
// must never expose their approval tokens or instructions to the browser.
export function studentFormKind(form: HumanForm): "issue" | "feedback" | null {
  if (!Array.isArray(form.inputs) || !form.inputs.length || !form.inputs.every(input => input.type === "paragraph")) return null;
  if (form.inputs.length === 1 && form.inputs[0].output_variable_name === "service_issue") return "issue";
  const actions = form.user_actions || form.actions || [];
  if (form.inputs.length <= 3 && !form.inputs.some(input => input.output_variable_name === "human_reply") &&
    actions.some(action => action.id === "SUBMIT_FEEDBACK" || action.title === "SUBMIT_FEEDBACK" || action.title === "提交反馈")) return "feedback";
  return null;
}

export function isCancelAction(action: { id: string; title: string }) {
  return action.id === "CANCEL" || action.title === "CANCEL" || action.title === "取消" || action.title === "取消反馈";
}

export function publicHumanForm(form: HumanForm): HumanForm {
  const kind = studentFormKind(form);
  if (kind && form.form_token) return { ...form, kind, actions: form.user_actions || form.actions || [] };
  return { awaitingStaff: true, node_title: "等待工作人员回复", form_content: "问题已提交，工作人员处理后，回复会自动显示在这里。", inputs: [], actions: [], expiration_time: form.expiration_time };
}

type Source = { dataset_name?: string; document_name?: string; content?: string; score?: number };
type Event = {
  event: string; answer?: string; conversation_id?: string; message_id?: string; workflow_run_id?: string;
  metadata?: { retriever_resources?: Source[] };
  data?: Partial<HumanForm> & { status?: string; outputs?: { answer?: string; human_reply?: string }; text?: string; reasons?: Partial<HumanForm>[] };
};

export function difyConfig() {
  const key = process.env.DIFY_API_KEY;
  if (!key) throw new Error("尚未配置 Dify 服务密钥。");
  return {
    base: (process.env.DIFY_API_BASE_URL || "https://api.dify.ai/v1").replace(/\/$/, ""),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  };
}

// Consume only public answer/form events. Never send internal node traces to the browser.
export async function readDifyStream(response: Response) {
  if (!response.ok) throw new Error(`Dify 请求失败（${response.status}），请稍后重试。`);
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("Dify 未返回预期的事件流，请检查应用配置。");
  }
  const result = { answer: "", conversationId: "", messageId: "", workflowRunId: "", status: "running", sources: [] as { datasetName?: string; documentName?: string; content?: string; score?: number }[], humanForm: null as HumanForm | null };
  let textChunks = "";
  function consume(frame: string) {
    const payload = frame.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
    if (!payload || payload === "[DONE]") return;
    const event = JSON.parse(payload) as Event;
    result.conversationId = event.conversation_id || result.conversationId;
    result.messageId = event.message_id || result.messageId;
    result.workflowRunId = event.workflow_run_id || (event.data as { workflow_run_id?: string })?.workflow_run_id || result.workflowRunId;
    if (event.event === "error") throw new Error("Dify 流程执行失败，请稍后重试。");
    if (event.event === "message" || event.event === "agent_message") result.answer += event.answer || "";
    if (event.event === "text_chunk") textChunks += event.data?.text || "";
    if (event.event === "message_replace") result.answer = event.answer || "";
    if (event.event === "human_input_required" && event.data?.form_content) result.humanForm = event.data as HumanForm;
    if (event.event === "workflow_paused") {
      result.status = "paused";
      const form = event.data?.reasons?.find(reason => reason.form_content);
      if (!result.humanForm && form) result.humanForm = form as HumanForm;
    }
    if (event.event === "workflow_finished") {
      result.humanForm = null;
      result.status = event.data?.status || "succeeded";
      if (["failed", "stopped", "partial-succeeded"].includes(result.status)) throw new Error("Dify 流程未能完成，请稍后重试。");
      const output = event.data?.outputs;
      if (typeof output?.answer === "string" && output.answer.trim()) result.answer = output.answer;
      else if (typeof output?.human_reply === "string" && output.human_reply.trim()) result.answer = output.human_reply;
      else if (!result.answer) result.answer = textChunks;
    }
    if (event.event === "message_end") {
      if (result.status === "running") result.status = "succeeded";
      result.sources = (event.metadata?.retriever_resources || []).map(item => ({ datasetName: item.dataset_name, documentName: item.document_name, content: item.content, score: item.score }));
    }
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let end;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        consume(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
      }
      if (done) { if (buffer.trim()) consume(buffer); break; }
      if (result.status === "paused") { await reader.cancel(); break; }
    }
  } finally { reader.releaseLock(); }
  if (result.humanForm) {
    result.humanForm = publicHumanForm(result.humanForm);
    result.status = "paused";
  }
  if (result.status === "running") throw new Error("连接中断，尚未收到完整结果，请重试。");
  return result;
}
