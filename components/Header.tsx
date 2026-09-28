"use client";

import Icon from "./Icon";
import SchoolEmblem from "./SchoolEmblem";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncLocation = () => setHash(window.location.hash);
    syncLocation();
    window.addEventListener("hashchange", syncLocation);
    window.addEventListener("popstate", syncLocation);
    return () => {
      window.removeEventListener("hashchange", syncLocation);
      window.removeEventListener("popstate", syncLocation);
    };
  }, [pathname]);

  const active = pathname === "/history" ? "history"
    : pathname === "/" ? (hash === "#guide" ? "guide" : hash === "#faq" ? "faq" : "home")
    : "";
  const navProps = (section: string) => ({
    className: active === section ? "active" : "",
    "aria-current": active === section ? "location" as const : undefined,
  });
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="返回首页">
        <SchoolEmblem />
        <span className="brand-title"><span>江西师范高等专科学校</span><span className="brand-subtitle">新生AI助手</span></span>
      </Link>
      <nav className="nav-links">
        <Link {...navProps("home")} href="/" onNavigate={() => setHash("")}><Icon name="home" size={17} />首页</Link>
        <a {...navProps("guide")} href="/#guide"><Icon name="book" size={17} />新生指南</a>
        <a {...navProps("faq")} href="/#faq"><Icon name="help" size={17} />常见问题</a>
        <Link {...navProps("history")} href="/history"><Icon name="history" size={17} />历史会话</Link>
      </nav>
      <div className="header-actions">
        <Link href="/chat" className="button button-primary button-sm"><Icon name="chat" size={18} />开始对话</Link>
      </div>
    </header>
  );
}
