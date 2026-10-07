import { sessionUser } from "../../../lib/server-session";
import { NextRequest, NextResponse } from "next/server";
import { difyConfig, readDifyStream, studentFormKind, isCancelAction, type HumanForm } from "../../../lib/dify";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await sessionUser(request);
    const { base, headers } = difyConfig();
    if (body.operation === "resume") {
      if (typeof body.workflowRunId !== "string" || !body.workflowRunId) return NextResponse.json({ error: "缺少流程编号" }, { status: 400 });
      const response = await fetch(`${base}/workflow/${encodeURIComponent(body.workflowRunId)}/events?user=${encodeURIComponent(user)}&include_state_snapshot=true`, { headers, cache: "no-store", signal: AbortSignal.timeout(50000) });
      return NextResponse.json(await readDifyStream(response, { maxWaitMs: 25000 }));
    }
    if (typeof body.formToken !== "string" || !body.formToken || typeof body.action !== "string" || !body.inputs || typeof body.inputs !== "object" || Array.isArray(body.inputs)) {
      return NextResponse.json({ error: "请完整填写表单" }, { status: 400 });
    }
    // Only the student issue and feedback forms may be submitted publicly.
    // Staff approval forms remain in Dify/email, even for an old browser tab.
    const formUrl = `${base}/form/human_input/${encodeURIComponent(body.formToken)}`;
    const definition = await fetch(formUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!definition.ok) return NextResponse.json({ error: "表单不可用，可能已提交或过期。" }, { status: definition.status });
    const form = await definition.json() as HumanForm;
    if (!studentFormKind(form)) {
      return NextResponse.json({ error: "此表单由工作人员处理，请等待回复。" }, { status: 403 });
    }
    const action = (form.user_actions || form.actions || []).find(item => item.id === body.action);
    if (!action) return NextResponse.json({ error: "此表单不支持该操作，请刷新后重试。" }, { status: 400 });
    const fields = new Set(form.inputs.map(input => input.output_variable_name));
    if (Object.keys(body.inputs).some(key => !fields.has(key)) || form.inputs.some(input => {
      const value = body.inputs[input.output_variable_name];
      return typeof value !== "string" || value.length > 10000;
    })) return NextResponse.json({ error: "表单内容格式不正确或过长，请检查后重试。" }, { status: 400 });
    if (studentFormKind(form) === "issue" && !isCancelAction(action) && !body.inputs.service_issue.trim()) {
      return NextResponse.json({ error: "请填写需要人工处理的问题。" }, { status: 400 });
    }
    const response = await fetch(formUrl, {
      method: "POST", headers,
      body: JSON.stringify({ inputs: body.inputs, action: body.action, user }),
      cache: "no-store", signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return NextResponse.json({ error: `表单未能提交（${response.status}）。请检查内容；表单可能已过期或已提交。` }, { status: response.status });
    return NextResponse.json({ submitted: true });
  } catch {
    return NextResponse.json({ error: "暂时无法确认流程状态，请稍后检查；若已提交，请勿重复提交。" }, { status: 502 });
  }
}
