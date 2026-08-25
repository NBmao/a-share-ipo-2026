import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_SC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "2026新股交易记账",
  description:
    "2026年主板、创业板、科创板新股列表与首日买入、次日卖出收益记账。",
  appleWebApp: {
    capable: true,
    title: "2026新股",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f2744",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${sans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f3f6fa] pb-[env(safe-area-inset-bottom)]">
        {children}
      </body>
    </html>
  );
}
