import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "../lib/query-provider";

export const metadata: Metadata = {
  title: "AlgoWix Platform",
  description: "One login. One dashboard. Every AlgoWix product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
