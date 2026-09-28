export const SESSION_COOKIE = "campus_session";
const encoder = new TextEncoder();
async function signingKey() {
  const secret = process.env.SESSION_SECRET || process.env.DIFY_API_KEY;
  if (!secret) throw new Error("服务端会话密钥未配置");
  return crypto.subtle.importKey("raw", encoder.encode(`campus-session-v1:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function createSession() {
  const id = crypto.randomUUID();
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(id));
  return `${id}.${Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}
export async function verifySession(value?: string) {
  if (!value || !/^[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(value)) return null;
  const [id, signature] = value.split(".");
  const valid = await crypto.subtle.verify("HMAC", await signingKey(), new Uint8Array(signature.match(/../g)!.map(byte => parseInt(byte, 16))), encoder.encode(id));
  return valid ? `web-${id}` : null;
}
export async function sessionUser(request: { cookies: { get(name: string): { value: string } | undefined } }) {
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) throw new Error("会话已失效，请刷新页面后重试。");
  return user;
}
