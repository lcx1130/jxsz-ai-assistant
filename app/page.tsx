import Link from "next/link";
import Icon, { type IconName } from "../components/Icon";
import SchoolEmblem from "../components/SchoolEmblem";
import Header from "../components/Header";

const abilities: [IconName, string, string][] = [
  ["book", "校园知识库", "回答基于校园资料"],
  ["source", "来源可追溯", "重要答案展示来源"],
  ["headset", "支持转人工", "复杂问题人工兜底"],
  ["chat", "多轮追问", "理解“那多少钱”等追问"],
];

const quickQuestions = [
  "宿舍是几人寝？",
  "校园卡怎么办理？",
  "快递在哪里拿？",
  "新生报到带什么？",
  "食堂几点营业？",
  "我要人工客服",
];

const guideSteps = [
  { title: "报到前准备", description: "了解报到所需材料、时间与地点，提前规划到校安排。", question: "新生报到需要准备哪些材料？报到时间和地点在哪里？" },
  { title: "到校与入住", description: "查询报到办理顺序、宿舍入住和校园卡办理方式。", question: "新生到校后如何报到、办理宿舍入住和校园卡？" },
  { title: "熟悉校园生活", description: "了解食堂、快递和校园网络，让日常生活更方便。", question: "新生如何使用食堂、领取快递和办理校园网络？" },
];

export default function HomePage() {
  return (
    <main className="app-shell school-home">
      <Header />

      <section className="hero container campus-hero">
        <div className="hero-copy">
          <span className="eyebrow">基于学校资料 · 24h 智能答疑</span>
          <h1><span className="hero-school-name">江西师范高等专科学校</span><br />新生<span className="hero-ai">AI助手</span></h1>
          <p>宿舍、报到、校园卡、快递、生活服务——把零散校园信息变成随问随答的 AI 助手。</p>
          <div className="hero-actions">
            <Link href="/chat" className="button button-primary button-lg"><Icon name="chat" />开始咨询</Link>
            <a href="#faq" className="button button-secondary button-lg">查看常见问题</a>
          </div>
        </div>

        <div className="assistant-preview">
          <div className="preview-identity"><SchoolEmblem /><span className="purple-pill">你的专属校园助手</span></div>
          <h2>你好，我是你的校园新生助手。</h2>
          <p>可以问我宿舍、报到、校园卡、快递等问题；复杂情况也可以转人工。</p>
          <div className="mini-input">
            <div>
              <strong>“宿舍是几人寝？有空调吗？”</strong>
              <span>点击发送，开始了解校园</span>
            </div>
            <Link href="/chat?question=宿舍是几人寝？有空调吗？" className="button button-primary"><Icon name="send" size={18} />发送</Link>
          </div>
        </div>
      </section>

      <section className="ability-grid container">
        {abilities.map(([index, title, desc]) => (
          <article className="ability-card" key={index}>
            <span className={`ability-index ${index === "headset" ? "orange" : ""}`}><Icon name={index} size={24} /></span>
            <div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          </article>
        ))}
      </section>

      <section id="guide" className="guide-section container" aria-labelledby="guide-title">
        <h2 id="guide-title">新生指南</h2>
        <p className="guide-intro">从报到准备到校园生活，按你的需要选择主题，向 AI 助手咨询。</p>
        <div className="guide-grid">
          {guideSteps.map((step, index) => (
            <article className="guide-card" key={step.title}>
              <span className="tag">第 {index + 1} 步</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <Link href={`/chat?question=${encodeURIComponent(step.question)}`} className="button button-secondary">咨询{step.title}</Link>
            </article>
          ))}
        </div>
        <p className="guide-note">具体材料、时间和办理要求，请以学校官方最新通知为准。</p>
      </section>

      <section id="faq" className="questions-section container">
        <h2>常见问题</h2>
        <p className="guide-intro">选择一个问题，进入聊天页面后点击发送，获取基于校园资料的回答。</p>
        <div className="question-grid">
          {quickQuestions.map((q, index) => (
            <Link key={q} href={`/chat?question=${encodeURIComponent(q)}`} className="question-card">
              <span className={q.includes("人工") ? "tag tag-orange" : "tag"}><Icon name={(["bed", "card", "box", "check", "food", "headset"] as IconName[])[index]} size={22} /></span>
              <strong>{q}</strong>
            </Link>
          ))}
        </div>
      </section>

      <footer className="author-footer container">
        <div className="author-credit">
          <span className="eyebrow">作者与反馈</span>
          <h2>作者：江西师专小晨</h2>
          <p>如果有疑问和建议，请联系作者。</p>
          <p className="author-account">抖音：@江西师专小晨<br />抖音号：<strong>Vsunny888888</strong></p>
          <p className="author-hint">打开抖音扫一扫，或搜索抖音号联系。点击名片可查看大图。</p>
        </div>
        <a href="/images/author-douyin.jpg" target="_blank" rel="noopener noreferrer" className="author-card-link" aria-label="查看作者江西师专小晨的抖音名片大图（新窗口）">
          <img src="/images/author-douyin.jpg" alt="江西师专小晨的抖音联系名片，抖音号 Vsunny888888" width={225} height={336} loading="lazy" />
          <span>查看抖音名片 ↗</span>
        </a>
        <div className="author-footer-bottom">江西师范高等专科学校新生AI助手</div>
      </footer>
    </main>
  );
}
