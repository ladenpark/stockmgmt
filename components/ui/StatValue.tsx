import React from "react";

interface StatValueProps {
  amount: number;
  percent?: number;
  currency?: "KRW" | "USD";
  showPrefix?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  percentClassName?: string;
  isDailyDelta?: boolean;
}

export function StatValue({
  amount,
  percent,
  currency = "KRW",
  showPrefix = true,
  size = "md",
  className = "",
  percentClassName = "",
}: StatValueProps) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;

  // Colors: Positive #16A34A, Negative #EF4444, Neutral #64748B
  const colorClass = isPositive
    ? "text-[#16A34A]"
    : isNegative
    ? "text-[#EF4444]"
    : "text-[#64748B]";

  const sign = isPositive && showPrefix ? "+" : isNegative ? "-" : "";
  const absAmount = Math.abs(Math.round(amount));

  const formattedAmount = currency === "KRW"
    ? `${sign}₩${absAmount.toLocaleString("ko-KR")}`
    : `${sign}$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const sizeClasses = {
    sm: "text-xs font-semibold",
    md: "text-sm font-bold",
    lg: "text-base font-bold",
    xl: "text-lg md:text-xl font-extrabold tracking-tight",
  };

  return (
    <span className={`inline-flex items-baseline gap-1 ${colorClass} ${className}`}>
      <span className={sizeClasses[size]}>{formattedAmount}</span>
      {percent !== undefined && (
        <span className={`text-[11px] md:text-xs font-semibold ${percentClassName}`}>
          ({isPositive ? "+" : isNegative ? "-" : ""}{Math.abs(percent).toFixed(2)}%)
        </span>
      )}
    </span>
  );
}
