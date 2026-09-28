import type { Metadata } from "next";
import "./globals.css";
import CampusCompanion from "../components/CampusCompanion";

export const metadata: Metadata = {
  title: "江西师范高等专科学校新生AI助手",
  icons: { icon: "/images/school-emblem.png", apple: "/images/school-emblem.png" },
  description: "基于校园资料的 AI 问答与人工协同服务系统",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}<CampusCompanion /></body>
    </html>
  );
}
