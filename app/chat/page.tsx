"use client";

import Icon from "../../components/Icon";
import SchoolEmblem from "../../components/SchoolEmblem";
import HumanInputForm from "../../components/HumanInputForm";
import type { HumanForm } from "../../lib/dify";
import ConversationList from "../../components/ConversationList";
import { makeUserId } from "../../lib/chat-user";
import { Suspense, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import ChatMarkdown from "../../components/ChatMarkdown";
import RunProgress from "../../components/RunProgress";

type Source = {
  datasetName?: string;
  documentName?: string;
  content?: string;
  score?: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  messageId?: string;
  humanForm?: HumanForm;
  workflowRunId?: string;
  status?: string;
};

function ChatContent() {
  const params = useSearchParams();
  const router = useRouter();
  const selectedConversation = params.get("conversation") || "";
  const [historyLoading, setHistoryLoading] = useState(false);
  const initialQuestion = params.get("question") || "";
  const [input, setInput] = useState(initialQuestion);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pendingHuman = messages.some(message => message.status === "paused");
  const pendingRun = messages.some(message => message.status === "running");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]); setConversationId(""); setHistoryLoading(false);
      return;
    }
    const controller = new AbortController();
    setHistoryLoading(true); setError("");
    async function restore() {
      try {
        let cursor = "";
        let all: ChatMessage[] = [];
        const seen = new Set<string>();
        do {
          const query = new URLSearchParams({ user: makeUserId(), conversationId: selectedConversation, ...(cursor ? { cursor } : {}) });
          const response = await fetch(`/api/history?${query}`, { signal: controller.signal });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          all = [...data.messages.filter((message: ChatMessage) => !all.some(existing => existing.id === message.id)), ...all];
          cursor = data.hasMore ? data.cursor : "";
          if (cursor && seen.has(cursor)) throw new Error("历史记录分页异常，请重试。");
          seen.add(cursor);
        } while (cursor);
        if (!controller.signal.aborted) {
          setMessages(all); setConversationId(selectedConversation); setInput("");
        }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "无法打开历史对话"); }
      finally { if (!controller.signal.aborted) setHistoryLoading(false); }
    }
    void restore();
    return () => controller.abort();
  }, [selectedConversation]);

  useEffect(() => { setInput(initialQuestion); }, [initialQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(question?: string) {
    const query = (question ?? input).trim();
    if (!query || loading || historyLoading || pendingHuman || pendingRun) return;

    setError("");
    setLoading(true);
    setInput("");
    const localId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: localId, role: "user", content: query }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          conversationId,
          user: makeUserId(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "请求失败");

      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId || crypto.randomUUID(),
          messageId: data.messageId,
          role: "assistant",
          content: data.answer || (data.status === "running" ? "正在整理查询结果…" : data.humanForm?.awaitingStaff ? "问题已提交，正在等待工作人员回复。" : data.humanForm ? "请填写下方表单，或选择取消。" : data.status === "paused" ? "流程正在等待人工处理。" : "本次流程已结束，但未提供回复，请重新提问。"),
          humanForm: data.humanForm,
          workflowRunId: data.workflowRunId,
          status: data.status,
          sources: data.sources || [],
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络请求失败");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage();
  }

  function newConversation() {
    if (loading || historyLoading) return;
    router.replace("/chat");
    setConversationId("");
    setMessages([]);
    setError("");
    setInput("");
  }

  return (
    <main className="app-shell chat-shell">
      <Header />
      <div className="chat-layout">
        <aside className="chat-sidebar">
          <h2>对话记录</h2>
          <button className="button button-primary sidebar-new" onClick={newConversation}>＋ 新建对话</button>
          <ConversationList activeId={conversationId} compact disabled={loading || historyLoading} />
        </aside>

        <section className="chat-main">
          <div className="chat-topbar">
            <div>
              <h1>新生AI助手</h1>
              <span className="status-pill">校园资料 · 联网查询 · 校园照片</span>
            </div>
            <button
              type="button"
              className="button button-secondary"
              disabled={loading || historyLoading || pendingHuman || pendingRun}
              onClick={() => sendMessage("提交反馈")}
            >
              提交反馈
            </button>
            <button type="button" className="button button-human" disabled={loading || historyLoading || pendingHuman || pendingRun} onClick={() => sendMessage("人工客服")}><Icon name="headset" size={18} />{pendingHuman ? "等待人工流程处理" : "我要人工客服"}</button>
            <button type="button" className="button button-secondary" disabled={loading || historyLoading} onClick={newConversation}>新建对话</button>
          </div>

          <div className="messages">
            {historyLoading && <p role="status">正在打开历史对话…</p>}
            {!historyLoading && messages.length === 0 && (
              <div className="empty-chat">
                <SchoolEmblem />
                <h2>今天想了解什么？</h2>
                <p>你可以查询校园资料、学习资源、公开通知，或查看食堂和寝室照片。</p>
                <div className="empty-quick">
                  {["有哪些四六级学习资源？", "看看食堂照片", "请联网查询学校的宿舍条件，并注明来源和日期"].map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <article className={`message-row ${message.role}`} key={message.id}>
                {message.role === "assistant" && <SchoolEmblem small />}
                <div className="message-stack">
                  <div className={`message-bubble ${message.role}`}>{message.role === "assistant" ? <ChatMarkdown content={message.content} /> : message.content}</div>
                  {message.status === "running" && message.workflowRunId && (
                    <RunProgress workflowRunId={message.workflowRunId} onResult={result => setMessages(previous => previous.map(item => item.id === message.id ? {
                      ...item, content: result.answer || (result.humanForm ? "请完成下方表单，或选择取消。" : result.status === "paused" ? "流程正在等待人工处理。" : "查询已结束，未取得有效资料。"),
                      humanForm: result.humanForm, workflowRunId: result.workflowRunId || item.workflowRunId, status: result.status, sources: result.sources || [],
                    } : item))} />
                  )}
                  {message.humanForm && message.workflowRunId && (
                    <HumanInputForm key={message.humanForm.form_token || message.id} form={message.humanForm} workflowRunId={message.workflowRunId} user={makeUserId()}
                      onResult={(result) => setMessages(previous => previous.map(item => item.id === message.id ? {
                        ...item, content: result.answer || (result.status === "running" ? "正在获取处理结果…" : result.humanForm?.awaitingStaff ? "问题已提交，正在等待工作人员回复。" : result.humanForm ? "请继续完成下方步骤。" : result.status === "paused" ? "问题已提交，流程正在等待人工处理。" : "人工流程已结束，但未返回回复内容。请联系工作人员检查处理结果。"),
                        humanForm: result.humanForm, workflowRunId: result.workflowRunId || item.workflowRunId, status: result.status,
                      } : item))} />
                  )}
                  {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                    <div className="sources-card">
                      <div className="sources-title"><span className="tag">来源</span> 本回答引用了 {message.sources.length} 条知识库内容</div>
                      {message.sources.slice(0, 3).map((source, index) => (
                        <div className="source-line" key={`${source.documentName}-${index}`}>
                          <strong>{source.documentName || source.datasetName || `知识库来源 ${index + 1}`}</strong>
                          {typeof source.score === "number" && <span>相关度 {(source.score * 100).toFixed(0)}%</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {message.role === "assistant" && message.status !== "paused" && message.status !== "running" && (
                    <div className="feedback-row">
                      <span>这个回答对你有帮助吗？</span>
                      <button className="feedback good">有帮助</button>
                      <button className="feedback bad">没帮助</button>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {loading && (
              <article className="message-row assistant">
                <SchoolEmblem small />
                <div className="message-bubble assistant typing">正在处理你的请求…</div>
              </article>
            )}
            {error && <div className="error-box">{error}</div>}
            <div ref={bottomRef} />
          </div>

          <form className="chat-composer" onSubmit={onSubmit}>
            <div className="composer-inner">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={pendingHuman || pendingRun}
                placeholder={pendingRun ? "正在查询资料，请稍候…" : pendingHuman ? "请先完成上方表单，或新建对话继续咨询" : "输入你的校园问题…"}
                rows={2}
              />
              <div className="composer-bottom">
                <span className="soft-pill">重要信息请核对来源和日期</span>
                <button className="button button-primary" disabled={loading || historyLoading || pendingHuman || pendingRun || !input.trim()} type="submit"><Icon name="send" size={18} />发送</button>
              </div>
            </div>
            <p>AI 可能出现错误，重要信息请以学校官方最新通知为准。</p>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return <Suspense fallback={<main className="app-shell"><Header /><p className="container" role="status">正在加载对话…</p></main>}><ChatContent /></Suspense>;
}
