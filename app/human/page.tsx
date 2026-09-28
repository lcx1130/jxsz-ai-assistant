import { redirect } from "next/navigation";

export default function HumanPage() {
  redirect(`/chat?question=${encodeURIComponent("人工客服")}`);
}
