import type { ReactNode } from "react";

import type { Room } from "@/lib/contracts/types";

export const THEME_LABELS: Record<Room["theme"], string> = {
  sunrise: "แสงเช้า",
  rose: "กุหลาบ",
  night: "ค่ำคืน",
};

const SKY: Record<Room["theme"], [string, string]> = {
  sunrise: ["#f7d58a", "#e9976d"],
  rose: ["#f3c9d0", "#d9879a"],
  night: ["#2d3a63", "#161e3d"],
};

const RIDGE: Record<Room["theme"], [string, string, string]> = {
  sunrise: ["#8aa17a", "#5f7f64", "#34594a"],
  rose: ["#b58a9c", "#8b6479", "#5c4258"],
  night: ["#3a4776", "#27325a", "#182142"],
};

type RoomCoverProps = {
  theme: Room["theme"];
  className?: string;
  children?: ReactNode;
};

/** Illustrated placeholder cover; swap for a real photo once rooms store one. */
export function RoomCover({ theme, className = "", children }: RoomCoverProps) {
  const [top, bottom] = SKY[theme];
  const [far, mid, near] = RIDGE[theme];

  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ background: `linear-gradient(180deg, ${top}, ${bottom})` }}>
      <svg aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full" preserveAspectRatio="xMidYMax slice" viewBox="0 0 400 240">
        <circle cx="285" cy="92" fill={theme === "night" ? "#f1ecd2" : "#fff3c9"} opacity={theme === "night" ? 0.95 : 0.9} r="22" />
        <path d="M0 170 80 110l60 45 70-60 80 70 110-55v90H0Z" fill={far} />
        <path d="M0 195 90 140l70 40 90-50 150 60v50H0Z" fill={mid} />
        <path d="M0 225 110 175l90 35 90-30 110 40v20H0Z" fill={near} />
      </svg>
      {children}
    </div>
  );
}
