/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface MaxaLogoProps {
  className?: string;
  showSubtext?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  lightColor?: string; // Color of text in light mode
  darkColor?: string;  // Color of text in dark mode
  isDarkTheme?: boolean;
}

export default function MaxaLogo({
  className = "",
  showSubtext = true,
  size = "md",
  lightColor = "#121c24",
  darkColor = "#f1f5f9",
  isDarkTheme = false,
}: MaxaLogoProps) {
  // Sizing definitions
  const dimensions = {
    sm: { width: "100px", height: "55px", viewBox: "0 0 200 110" },
    md: { width: "150px", height: "82px", viewBox: "0 0 200 110" },
    lg: { width: "190px", height: "105px", viewBox: "0 0 200 110" },
    xl: { width: "240px", height: "132px", viewBox: "0 0 200 110" },
  };

  const dim = dimensions[size];
  const textColor = isDarkTheme ? darkColor : lightColor;

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`} dir="rtl">
      <svg
        style={{ width: dim.width, height: dim.height }}
        viewBox={dim.viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-colors duration-300"
      >
        {/* Left Wing (Symmetrical Orange Swoosh from user's image) */}
        <path
          d="M 30,28 L 94,56 C 92,44 80,36 58,32 C 44,29 30,28 30,28 Z"
          fill="#e05a2b"
        />
        {/* Right Wing (Symmetrical Orange Swoosh from user's image) */}
        <path
          d="M 170,28 L 106,56 C 108,44 120,36 142,32 C 156,29 170,28 170,28 Z"
          fill="#e05a2b"
        />

        {/* stylized "maxa" text paths */}
        {/* m */}
        <path
          d="M 36,92 L 36,75 C 36,68 41,65 47,65 C 52,65 55,69 55,75 L 55,92 M 55,75 C 55,68 60,65 65,65 C 70,65 73,69 73,75 L 73,92"
          stroke={textColor}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* a */}
        <path
          d="M 91,80 C 91,72 86,66 80,66 C 74,66 69,72 69,80 C 69,88 74,94 80,94 C 86,94 91,88 91,80 Z"
          stroke={textColor}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 91,72 L 91,92"
          stroke={textColor}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* x */}
        <path
          d="M 102,67 L 118,91 M 118,67 L 102,91"
          stroke={textColor}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* a */}
        <path
          d="M 147,80 C 147,72 142,66 136,66 C 130,66 125,72 125,80 C 125,88 130,94 136,94 C 142,94 147,88 147,80 Z"
          stroke={textColor}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 147,72 L 147,92"
          stroke={textColor}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      
      {showSubtext && (
        <span 
          className="text-[10px] md:text-[11px] font-black tracking-tight text-center mt-2.5 transition-colors duration-300 text-slate-500 dark:text-slate-400"
          style={{ fontFamily: "Vazirmatn, sans-serif" }}
        >
          شرکت مهندسی کسرا رایانه آپادانا
        </span>
      )}
    </div>
  );
}
