"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/utils";

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20 });
  const display = useTransform(spring, (v) => (format ? format(v) : Math.round(v).toLocaleString()));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{display}</motion.span>;
}

const GRADIENTS = [
  "from-brand-500/10 to-brand-500/0",
  "from-emerald-500/10 to-emerald-500/0",
  "from-amber-500/10 to-amber-500/0",
  "from-sky-500/10 to-sky-500/0",
];

export function StatsCard({
  title,
  value,
  format,
  trend,
  trendLabel,
  icon: Icon,
  gradient = 0,
}: {
  title: string;
  value: number;
  format?: (n: number) => string;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  gradient?: number;
}) {
  const trendPositive = (trend ?? 0) >= 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", GRADIENTS[gradient % GRADIENTS.length])} />
      <div className="relative flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-subtle text-slate-500">
          <Icon size={16} />
        </div>
      </div>
      <p className="relative mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        <AnimatedNumber value={value} format={format} />
      </p>
      {trend !== undefined && (
        <div className="relative mt-2 flex items-center gap-1 text-xs font-medium">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
              trendPositive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
            )}
          >
            {trendPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
          {trendLabel && <span className="text-slate-400">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
