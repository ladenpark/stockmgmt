import React from "react";

interface SparklineChartProps {
  data?: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data = [100, 102, 101, 105, 104, 108, 107, 110],
  isPositive,
  width = 64,
  height = 28,
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color = isPositive ? "#22C55E" : "#EF4444";
  const fillGradientId = `sparkline-${isPositive ? "up" : "down"}-${Math.random().toString(36).substring(2, 6)}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
