"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "algowix:recent-pages";
const MAX = 5;

export function useTrackRecentPage() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return;
    const existing: string[] = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    const next = [pathname, ...existing.filter((p) => p !== pathname)].slice(0, MAX);
    sessionStorage.setItem(KEY, JSON.stringify(next));
  }, [pathname]);
}

export function getRecentPages(excludePathname?: string): string[] {
  if (typeof window === "undefined") return [];
  const pages: string[] = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
  return pages.filter((p) => p !== excludePathname);
}
