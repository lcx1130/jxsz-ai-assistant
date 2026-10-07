import { sessionUser } from "../../../lib/server-session";
import { NextRequest, NextResponse } from "next/server";
import { difyConfig, publicHumanForm, type HumanForm } from "../../../lib/dify";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const user = await sessionUser(request);
    const conversationId = params.get("conversationId");
    const query = new URLSearchParams({ user, limit: conversationId ? "100" : "20" });
    if (conversationId) query.set("conversation_id", conversationId);
    const cursor = params.get("cursor");
    if (cursor) query.set(conversationId ? "first_id" : "last_id", cursor);
    const { base, headers } = difyConfig();
    const response = await fetch(`${base}/${conversationId ? "messages" : "conversations"}?${query}`, { headers, cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!response.ok) return NextResponse.json({ error: `历史记录暂时无法读取（${response.status}），请重试。` }, { status: response.status });
    const result = await response.json();
    if (!conversationId) {
      const data = (result.data || []).map((item: { id: string; name: string; updated_at: number }) => ({ id: item.id, name: item.name || "未命名对话", updatedAt: item.updated_at }));
      return NextResponse.json({ data, hasMore: !!result.has_more, cursor: data.at(-1)?.id }, { headers: { "Cache-Control": "no-store" } });
    }
    type Message = { status?: string; extra_contents?: { type?: string; submitted?: boolean; workflow_run_id?: string; form_definition?: HumanForm }[]; id: string; query: string; answer: string; created_at: number; workflow_run_id?: string; retriever_resources?: { dataset_name?: string; document_name?: string; content?: string; score?: number }[] };
    const rows: Message[] = [...(result.data || [])].sort((a: Message, b: Message) => a.created_at - b.created_at);
    const messages = rows.flatMap(item => {
      const pending = item.status === "paused" ? item.extra_contents?.findLast(extra => extra.type === "human_input" && !extra.submitted && extra.form_definition) : undefined;
      const humanForm = pending?.form_definition ? publicHumanForm(pending.form_definition) : undefined;
      return [
      { id: `${item.id}-user`, role: "user", content: item.query },
      { id: item.id, messageId: item.id, role: "assistant", content: item.answer || (humanForm?.awaitingStaff ? "问题已提交，正在等待工作人员回复。" : humanForm ? "请填写下方表单，或选择取消。" : "此条消息尚无回复。"), workflowRunId: pending?.workflow_run_id || item.workflow_run_id, humanForm, status: item.status === "paused" ? "paused" : "succeeded",
        sources: (item.retriever_resources || []).map(source => ({ datasetName: source.dataset_name, documentName: source.document_name, content: source.content, score: source.score })) },
    ]; });
    return NextResponse.json({ messages, hasMore: !!result.has_more, cursor: rows[0]?.id }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "历史记录加载失败，请稍后重试。" }, { status: 502 }); }
}
