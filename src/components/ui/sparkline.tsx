"use client";

import { useId } from "react";

/**
 * Lightweight SVG sparkline chart.
 * Accepts an array of numeric data points and renders a smooth area chart.
 */

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 400,
  height = 80,
  color = "#BFFF00",
  className,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <div
        className={className}
        style={{ width, height, display: "flex", alignItems: "flex-end" }}
      >
        <div
          className="w-full rounded-lg"
          style={{ height: 2, backgroundColor: `${color}33` }}
        />
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 2;
  const plotH = height - padding * 2;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: padding + plotH - ((v - min) / range) * plotH,
  }));

  // Build smooth SVG path using cardinal spline-like segments
  let linePath = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }

  // Closed area path for the gradient fill
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  const gradientId = `sparkline-grad-${useId().replace(/:/g, "")}`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Generate sparkline data points from a total value.
 * Creates a realistic-looking curve that ends at the given value.
 */
export function generateSparklineData(
  totalValue: number,
  points = 20,
): number[] {
  if (totalValue <= 0) return Array(points).fill(0);

  const data: number[] = [];
  // Start at ~60-80% of current value and trend upward
  let val = totalValue * (0.6 + Math.random() * 0.2);

  for (let i = 0; i < points - 1; i++) {
    data.push(val);
    // Random walk biased toward the final value
    const progress = i / (points - 1);
    const target = totalValue;
    const drift = (target - val) * 0.15;
    const noise = totalValue * 0.05 * (Math.random() - 0.4);
    val = Math.max(0, val + drift + noise * (1 - progress));
  }
  // Ensure last point is the actual value
  data.push(totalValue);

  return data;
}
