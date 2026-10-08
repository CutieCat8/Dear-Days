import type { Metadata } from "next";
import { Lora, Noto_Sans_Thai, Noto_Serif_Thai } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const display = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const displayThai = Noto_Serif_Thai({ subsets: ["thai"], variable: "--font-serif-thai", display: "swap" });
const sans = Noto_Sans_Thai({ subsets: ["thai", "latin"], variable: "--font-noto-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Dear Days",
  description: "พื้นที่ส่วนตัวสำหรับเก็บและย้อนดูความทรงจำร่วมกัน",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className={`${display.variable} ${displayThai.variable} ${sans.variable}`} lang="th">
      <body>{children}</body>
    </html>
  );
}
