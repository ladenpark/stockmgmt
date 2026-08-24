"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Calendar, Sparkles, PieChart, Sliders } from "lucide-react";

export const BottomNav = () => {
  const pathname = usePathname();

  const navItems = [
    { id: "home", label: "홈", icon: Wallet, href: "/", active: pathname === "/" },
    { id: "daily", label: "데일리", icon: Calendar, href: "/daily", active: pathname.startsWith("/daily") },
    { id: "whatif", label: "What-If", icon: Sparkles, href: "/whatif", active: pathname.startsWith("/whatif") },
    { id: "analysis", label: "분석", icon: PieChart, href: "/analysis", active: pathname.startsWith("/analysis") },
    { id: "hub", label: "허브", icon: Sliders, href: "/hub", active: pathname.startsWith("/hub") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E8EB] shadow-[0_-4px_16px_rgba(0,0,0,0.03)] px-3 py-2 flex items-center justify-around max-w-lg mx-auto md:max-w-4xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.active;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              isActive
                ? "text-[#094cb2] font-extrabold"
                : "text-[#8B95A1] hover:text-[#191F28] font-medium"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
            <span className="text-[11px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
