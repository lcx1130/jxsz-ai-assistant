"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// HTML is disabled. Markdown links keep the renderer's safe URL policy.
export default function ChatMarkdown({ content }: { content: string }) {
  return <div className="chat-markdown"><Markdown remarkPlugins={[remarkGfm]} skipHtml
    components={{
      a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
      img: ({ src, alt }) => typeof src === "string" && src ? <a href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt={alt || "校园参考照片"} loading="lazy" referrerPolicy="no-referrer" /></a> : <span>{alt || "图片暂不可用"}</span>,
    }}
  >{content}</Markdown></div>;
}
