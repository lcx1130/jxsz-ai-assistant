export function makeUserId() {
  const existing = localStorage.getItem("campus_ai_user_id");
  if (existing) return existing;
  const id = `web-${crypto.randomUUID()}`;
  localStorage.setItem("campus_ai_user_id", id);
  return id;
}
