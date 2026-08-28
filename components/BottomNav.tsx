"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  CalendarDays,
  ReceiptText,
  PieChart,
  SlidersHorizontal,
} from "lucide-react";

export const BottomNav = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isTransactionTab = pathname === "/" && searchParams.get("tab") === "transactions";

  const navItems = [
    {
      id: "home",
      label: "홈",
      icon: Home,
      href: "/",
      active: pathname === "/" && !isTransactionTab,
    },
    {
      id: "daily",
      label: "데일리",
      icon: CalendarDays,
      href: "/daily",
      active: pathname.startsWith("/daily"),
    },
    {
      id: "transactions",
      label: "거래내역",
      icon: ReceiptText,
      href: "/?tab=transactions",
      active: isTransactionTab,
    },
    {
      id: "analysis",
      label: "분석",
      icon: PieChart,
      href: "/analysis",
      active: pathname.startsWith("/analysis"),
    },
    {
      id: "hub",
      label: "허브",
      icon: SlidersHorizontal,
      href: "/hub",
      active: pathname.startsWith("/hub"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] shadow-[0_-2px_10px_rgba(15,23,42,0.04)] px-2 py-1.5 flex items-center justify-around max-w-lg mx-auto md:max-w-4xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.active;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all ${
              isActive
                ? "text-[#1366FF] font-bold"
                : "text-[#94A3B8] hover:text-[#475569] font-medium"
            }`}
          >
            <Icon
              className="w-5 h-5 transition-transform"
              strokeWidth={isActive ? 2.2 : 1.75}
            />
            <span className="text-[11px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
