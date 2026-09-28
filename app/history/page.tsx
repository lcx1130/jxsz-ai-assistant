import Link from "next/link";
import Header from "../../components/Header";
import ConversationList from "../../components/ConversationList";

export default function HistoryPage() {
  return <main className="app-shell">
    <Header />
    <section className="container human-page">
      <h1>历史对话</h1>
      <p className="guide-intro">查看当前浏览器用户的咨询记录，点击任意记录可继续对话。</p>
      <Link href="/chat" className="button button-primary">开始新对话</Link>
      <ConversationList />
    </section>
  </main>;
}
