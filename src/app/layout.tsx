import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import TickerBar from "@/components/TickerBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "qcom",
  description: "Varasidhi Enterprises - internal stock & billing system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <TickerBar />
        <div className="flex flex-1 min-h-0">
          <Nav />
          <main className="flex-1 min-w-0 p-8 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
