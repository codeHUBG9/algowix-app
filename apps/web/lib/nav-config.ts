import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  CreditCard,
  BarChart3,
  ScrollText,
  FolderOpen,
  Plug,
  Terminal,
  Settings,
  Boxes,
  Contact,
  UserSquare2,
  Bell,
  type LucideIcon,
} from "lucide-react";

export type NavItem =
  | { type: "link"; href: string; label: string; icon: LucideIcon; shortcut?: string }
  | { type: "launch"; slug: string; label: string; icon: LucideIcon; shortcut?: string };

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ type: "link", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "G D" }],
  },
  {
    label: "Organization",
    items: [
      { type: "link", href: "/dashboard/organization", label: "Organization", icon: Building2 },
      { type: "link", href: "/dashboard/members", label: "Members", icon: Users, shortcut: "G M" },
    ],
  },
  {
    label: "Products & Billing",
    items: [
      { type: "link", href: "/dashboard/products", label: "Products", icon: Package },
      { type: "link", href: "/dashboard/billing", label: "Billing", icon: CreditCard, shortcut: "G B" },
    ],
  },
  {
    label: "Operations",
    items: [
      { type: "link", href: "/dashboard/inventory", label: "Inventory", icon: Boxes, shortcut: "G I" },
      { type: "launch", slug: "crm", label: "CRM", icon: Contact, shortcut: "G C" },
      { type: "launch", slug: "hrms", label: "HRMS", icon: UserSquare2, shortcut: "G H" },
    ],
  },
  {
    label: "Insights",
    items: [
      { type: "link", href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      { type: "link", href: "/dashboard/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
  {
    label: "Platform",
    items: [
      { type: "link", href: "/dashboard/files", label: "Files", icon: FolderOpen },
      { type: "link", href: "/dashboard/integrations", label: "Integrations", icon: Plug },
      { type: "link", href: "/dashboard/developer", label: "Developer", icon: Terminal },
    ],
  },
  {
    label: "",
    items: [
      { type: "link", href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { type: "link", href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const PAGE_LABELS: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items).filter((i): i is Extract<NavItem, { type: "link" }> => i.type === "link").map((i) => [i.href, i.label])
);
