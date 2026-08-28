"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, Calculator, CircleDollarSign, LineChart, PieChart, ChevronRight } from "lucide-react";

export const QuickNavButtons: React.FC = () => {
  const navItems = [
    {
      id: "profit",
      label: "수익",
      icon: TrendingUp,
      href: "/analysis?tab=profit",
      color: "text-[#1366FF]",
      bg: "bg-[#EBF2FF]",
    },
    {
      id: "tax",
      label: "세금",
      icon: Calculator,
      href: "/analysis?tab=tax",
      color: "text-[#8B5CF6]",
      bg: "bg-[#F3E8FF]",
    },
    {
      id: "dividend",
      label: "배당",
      icon: CircleDollarSign,
      href: "/analysis?tab=dividend",
      color: "text-[#F59E0B]",
      bg: "bg-[#FEF3C7]",
    },
    {
      id: "trend",
      label: "추이",
      icon: LineChart,
      href: "/analysis?tab=trend",
      color: "text-[#10B981]",
      bg: "bg-[#D1FAE5]",
    },
    {
      id: "weight",
      label: "비중",
      icon: PieChart,
      href: "/analysis?tab=weight",
      color: "text-[#EC4899]",
      bg: "bg-[#FCE7F3]",
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-sm font-bold text-[#0F172A]">빠른 분석 바로가기</h2>
        <Link
          href="/analysis"
          className="flex items-center gap-0.5 text-xs font-semibold text-[#1366FF] hover:underline"
        >
          <span>전체보기</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] transition-all active:scale-95 text-center group"
            >
              <div
                className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} mb-1.5 transition-transform group-hover:scale-105`}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-[#0F172A]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
