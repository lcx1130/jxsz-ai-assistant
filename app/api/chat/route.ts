import { sessionUser } from "../../../lib/server-session";
import { NextRequest, NextResponse } from "next/server";
import { difyConfig, readDifyStream } from "../../../lib/dify";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const user = await sessionUser(request);
    if (!query) return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
    const { base, headers } = difyConfig();
    const response = await fetch(`${base}/chat-messages`, {
      method: "POST", headers,
      body: JSON.stringify({ inputs: {}, query, response_mode: "streaming", user, ...(conversationId ? { conversation_id: conversationId } : {}) }),
      cache: "no-store", signal: AbortSignal.timeout(50000),
    });
    const result = await readDifyStream(response, { maxWaitMs: 35000 });
    return NextResponse.json({ ...result, conversationId: result.conversationId || conversationId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "服务暂不可用" }, { status: 502 });
  }
}
