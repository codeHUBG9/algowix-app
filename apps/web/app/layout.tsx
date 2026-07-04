import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "../lib/query-provider";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "AlgoWix Platform",
  description: "One login. One dashboard. Every AlgoWix product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface-muted text-slate-900 antialiased dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>{children}</QueryProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
