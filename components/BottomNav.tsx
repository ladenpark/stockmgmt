"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Heart, MessageSquareQuote, Trophy, Compass, Gift, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const BottomNav = () => {
  const pathname = usePathname();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAssetsActive = pathname === "/" || pathname.startsWith("/analysis");

  const navItems = [
    { id: "assets", label: "자산", icon: Wallet, href: "/", active: isAssetsActive },
    { id: "watchlist", label: "관심", icon: Heart, href: "#", active: false },
    { id: "review", label: "리뷰", icon: MessageSquareQuote, href: "#", active: false },
    { id: "league", label: "리그", icon: Trophy, href: "#", active: false },
    { id: "explore", label: "탐색", icon: Compass, href: "#", active: false },
    { id: "benefits", label: "혜택", icon: Gift, href: "#", active: false },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.href === "#") {
      setToastMessage(`'${item.label}' 메뉴 서비스 준비 중입니다.`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#191F28] text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl z-50 flex items-center gap-2 border border-white/10"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6-Icon Fixed Bottom Navigation Bar */}
      <nav className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E8EB] shadow-[0_-4px_16px_rgba(0,0,0,0.04)] px-3 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          if (item.href !== "#") {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
                  isActive
                    ? "text-[#3182F6] font-extrabold"
                    : "text-[#8B95A1] hover:text-[#191F28] font-medium"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[#8B95A1] hover:text-[#191F28] font-medium transition-all"
            >
              <Icon className="w-5 h-5 stroke-[1.75]" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
