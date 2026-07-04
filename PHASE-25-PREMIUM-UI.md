# Phase 25 — Premium UI/UX Overhaul

> **Assignee:** AI Agent  
> **Depends on:** Phases 06–22 (all server modules, Prisma schema, web dashboard routes confirmed implemented)  
> **Scope:** Frontend-only unless noted. No new backend phases — wire to existing APIs.  
> **Stack:** Next.js 14 App Router · Tailwind CSS · shadcn/ui · Framer Motion · Zustand

---

## 0. Design Tokens & Theme System

Before touching any component, establish a single source of truth for the visual language.

### 0.1 Color Palette

```ts
// tailwind.config.ts — extend colors
colors: {
  brand: {
    50:  '#f0f4ff',
    100: '#e0eaff',
    200: '#c7d7fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',   // primary
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  surface: {
    DEFAULT: '#ffffff',
    muted:   '#f8fafc',
    subtle:  '#f1f5f9',
    overlay: '#0f172a',
  },
}
```

### 0.2 Typography Scale

- Font: `Inter` (body) + `Cal Sans` or `Geist` (headings)
- Import via `next/font/google`
- Set `font-feature-settings: "cv02", "cv03", "cv04", "cv11"` for Inter ligatures

### 0.3 Radius & Shadow Tokens

```css
--radius-sm:  4px;
--radius-md:  8px;
--radius-lg:  12px;
--radius-xl:  16px;
--radius-2xl: 24px;

--shadow-card: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
--shadow-float: 0 8px 24px rgba(0,0,0,.12);
--shadow-modal: 0 24px 48px rgba(0,0,0,.18);
```

### 0.4 Dark Mode

- Use `next-themes` with `class` strategy
- All tokens must have a dark-mode counterpart via CSS variables
- Sidebar, cards, and modals must flip correctly

---

## 1. Global Shell & Layout

### 1.1 App Shell Structure

```
┌─────────────────────────────────────────────────────────┐
│  TopBar (64px, sticky)                                  │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │  Main Content Area                           │
│ (240px,  │  (scrollable, padding 24px)                  │
│  fixed)  │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### 1.2 Sidebar

**File:** `apps/web/components/layout/sidebar.tsx`

Features:
- Collapsible to icon-only rail (64px) with tooltip labels on hover
- Smooth width transition via Framer Motion `layout` prop
- Collapse state persisted in `localStorage`
- Active link indicator: left border accent + subtle background fill
- Grouped navigation with section labels
- User avatar + name at bottom with mini account menu

Navigation groups:

```
📊  Overview
    Dashboard

🏢  Platform
    Organizations
    Members
    Products
    Subscriptions
    Billing

⚙️  Operations
    Inventory          ← NEW (Phase 25)
    CRM                ← NEW
    HRMS               ← NEW
    Reports
    Audit Logs
    Files

🔗  Developer
    API Keys
    Webhooks
    Integrations
    Marketplace

🔔  System
    Notifications
    Settings
    Security
```

### 1.3 TopBar

**File:** `apps/web/components/layout/topbar.tsx`

Left side:
- Hamburger/collapse toggle for sidebar
- Breadcrumb (auto-generated from route segments, `usePathname`)

Center:
- **Command Palette trigger button** — `⌘K` badge, subtle border, placeholder "Search anything..."
- Click OR `Ctrl+K` / `Cmd+K` opens Command Palette (§2)

Right side:
- **AI Chat toggle button** — sparkle icon, opens AI drawer (§3)
- Notification bell with unread badge (live via existing SSE)
- Theme toggle (sun/moon)
- User avatar dropdown:
  - Profile
  - Switch Organization (tenant switcher)
  - Keyboard shortcuts
  - Sign out

---

## 2. Command Palette (`Ctrl+K`)

**File:** `apps/web/components/command-palette/index.tsx`  
**Library:** `cmdk` (already used by shadcn) — use `<CommandDialog>`

### 2.1 Trigger

```tsx
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setOpen(prev => !prev)
    }
  }
  document.addEventListener('keydown', down)
  return () => document.removeEventListener('keydown', down)
}, [])
```

### 2.2 Groups & Commands

```
🔍  Navigation
    Go to Dashboard
    Go to Billing
    Go to Members
    Go to Reports
    Go to Integrations
    ... (all sidebar routes)

⚡  Quick Actions
    Invite Member
    Create Product
    Generate API Key
    Add Webhook
    Create Invoice
    Add Inventory Item      ← NEW
    Add CRM Contact         ← NEW
    Add Employee            ← NEW

📄  Recent Pages
    (last 5 visited routes from sessionStorage)

🤖  Ask AI
    "Ask AI about this..."  → opens AI Chat drawer pre-filled

🔧  Settings
    Edit Profile
    Manage Billing
    Security Settings
    Dark / Light Mode toggle
```

### 2.3 Search Behavior

- Filter commands fuzzy-match via `cmdk` built-in scoring
- If no command matches, show **"Ask AI: {query}"** as last option → routes to AI Chat
- Keyboard: `↑↓` navigate, `Enter` execute, `Esc` close

### 2.4 Styling

- Full-screen overlay with `backdrop-blur-sm` + dark scrim
- Modal card: `max-w-2xl`, `rounded-2xl`, `shadow-modal`
- Input font size `18px` for premium feel
- Smooth open/close animation via `DialogContent` with `data-state` CSS transitions

---

## 3. AI Chat Drawer

**File:** `apps/web/components/ai-chat/index.tsx`

### 3.1 Layout

- Right-side sliding drawer, 420px wide
- Slide-in from right: `translateX(100%) → translateX(0)` via Framer Motion
- Does NOT push main content — overlays with subtle backdrop
- Persists open state across route changes (Zustand store)
- Minimise to a floating bubble (bottom-right, 56px circle) when closed

### 3.2 AI Chat Features

- **System context-aware:** automatically reads current page route and passes as context (`"User is on /dashboard/billing"`)
- **Streaming responses** via `claude-sonnet-4-6` with `fetch` + `ReadableStream` (server action or `/api/ai-chat` route)
- **Markdown rendering** in bot messages: code blocks, tables, bold — use `react-markdown` + `rehype-highlight`
- **Suggested prompts** on first open (contextual per page):
  - On Billing: "Explain my current invoice", "Which plan has the best value?", "How do I apply a coupon?"
  - On RBAC: "What permissions does Manager role have?", "How do I restrict product access?"
  - On Reports: "Summarize last month's revenue", "Which org has most API usage?"
  - On Inventory: "Show low stock items", "What's the reorder policy?"
  - On CRM: "Upcoming follow-ups this week", "Deals closing soon"
  - On HRMS: "Pending leave requests", "Headcount by department"
- **Message history** stored in component state (cleared on drawer close, no server persistence needed)
- **Copy** button on each bot message
- **Thumbs up/down** feedback buttons (fire-and-forget `POST /api/ai-feedback`)

### 3.3 API Route

**File:** `apps/web/app/api/ai-chat/route.ts`

```ts
// POST /api/ai-chat
// Body: { messages: [{role, content}][], pageContext: string }
// Streams SSE back to client
// Uses ANTHROPIC_API_KEY from env
// Model: claude-sonnet-4-6
// System prompt: see §3.4
```

### 3.4 AI System Prompt

```
You are the built-in AI assistant for [Platform Name], a multi-tenant SaaS platform.
You have access to the user's current page context.
Help with: navigation, understanding data, explaining features, drafting content, 
answering questions about billing/subscriptions/RBAC/integrations/inventory/CRM/HRMS.
Be concise. Use markdown for structure. Never fabricate data — if you don't know, say so.
Current page context: {pageContext}
```

---

## 4. Dashboard Home (`/dashboard`)

**File:** `apps/web/app/(platform)/dashboard/page.tsx`

### 4.1 Hero Stats Row

4 KPI cards in a responsive grid (`grid-cols-2 lg:grid-cols-4`):

| Card | Metric | Icon | Trend |
|------|--------|------|-------|
| Total Revenue | Sum of paid invoices | `DollarSign` | vs last month % |
| Active Subscriptions | Count of active subs | `Zap` | vs last month |
| Total Members | Across all orgs | `Users` | new this month |
| API Calls Today | From `ApiRequestLog` | `Activity` | vs yesterday |

Each card:
- Animated number counter on mount (Framer Motion `useMotionValue` + `useTransform`)
- Subtle gradient background unique per card
- Trend pill: green up arrow or red down arrow

### 4.2 Charts Row

Left (60%): **Revenue Over Time** — area chart, last 12 months, `recharts`  
Right (40%): **Subscription Plan Distribution** — donut chart with legend

### 4.3 Recent Activity Feed

- Live feed of `AuditLog` entries (last 20), auto-updates every 30s
- Each entry: avatar initial + action text + relative time (`date-fns`)
- Diff highlight: created=green, updated=blue, deleted=red badge

### 4.4 Quick Actions Grid

6 action tiles below the fold:
- Invite Member, Create Product, Generate API Key, Add Inventory Item, Add CRM Deal, Run Report

---

## 5. New Module — Inventory (`/dashboard/inventory`)

> Wire to a new `inventory` Prisma model. Add server module. This IS a backend addition.

### 5.1 Prisma Schema Addition

```prisma
model InventoryItem {
  id              String   @id @default(cuid())
  orgId           String
  org             Organization @relation(fields: [orgId], references: [id])
  sku             String
  name            String
  description     String?
  category        String?
  quantity        Int      @default(0)
  reorderPoint    Int      @default(10)
  unitCost        Decimal  @db.Decimal(10,2)
  unitPrice       Decimal  @db.Decimal(10,2)
  supplierId      String?
  location        String?
  status          InventoryStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  movements       InventoryMovement[]
}

model InventoryMovement {
  id          String   @id @default(cuid())
  itemId      String
  item        InventoryItem @relation(fields: [itemId], references: [id])
  type        MovementType   // IN | OUT | ADJUSTMENT
  quantity    Int
  reason      String?
  performedBy String
  createdAt   DateTime @default(now())
}

enum InventoryStatus { ACTIVE INACTIVE DISCONTINUED }
enum MovementType    { IN OUT ADJUSTMENT }
```

### 5.2 Server Module

`apps/server/src/modules/inventory/`
- `inventory.module.ts`
- `inventory.service.ts` — CRUD + low-stock query
- `inventory.controller.ts` — REST endpoints
- Routes: `GET /inventory`, `POST /inventory`, `PATCH /inventory/:id`, `DELETE /inventory/:id`, `POST /inventory/:id/movement`, `GET /inventory/low-stock`

### 5.3 UI Pages

**List page** (`/dashboard/inventory`):
- DataTable with columns: SKU, Name, Category, Qty (color-coded: red if ≤ reorder point), Unit Price, Status, Actions
- Filter bar: Category, Status, Low Stock toggle
- Bulk actions: Export CSV, Adjust Quantities
- "Add Item" button → drawer form

**Detail page** (`/dashboard/inventory/[id]`):
- Item details card
- Movement history timeline
- Edit form
- Quick adjustment widget (+/- quantity with reason)

**Low Stock Alert Banner:**
- Shown in sidebar badge and on inventory list if any items ≤ reorder point

---

## 6. New Module — CRM (`/dashboard/crm`)

> New backend module + Prisma models.

### 6.1 Prisma Schema Addition

```prisma
model CrmContact {
  id          String   @id @default(cuid())
  orgId       String
  org         Organization @relation(fields: [orgId], references: [id])
  firstName   String
  lastName    String
  email       String?
  phone       String?
  company     String?
  title       String?
  stage       ContactStage @default(LEAD)
  ownerId     String       // User who owns this contact
  tags        String[]
  notes       String?
  lastContactedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deals       CrmDeal[]
  activities  CrmActivity[]
}

model CrmDeal {
  id          String   @id @default(cuid())
  orgId       String
  contactId   String
  contact     CrmContact @relation(fields: [contactId], references: [id])
  title       String
  value       Decimal  @db.Decimal(10,2)
  stage       DealStage @default(PROSPECT)
  probability Int      @default(20)  // 0-100%
  expectedClose DateTime?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CrmActivity {
  id          String   @id @default(cuid())
  contactId   String
  contact     CrmContact @relation(fields: [contactId], references: [id])
  type        ActivityType  // CALL | EMAIL | MEETING | NOTE | TASK
  subject     String
  body        String?
  dueAt       DateTime?
  completedAt DateTime?
  performedBy String
  createdAt   DateTime @default(now())
}

enum ContactStage { LEAD QUALIFIED OPPORTUNITY CUSTOMER CHURNED }
enum DealStage    { PROSPECT PROPOSAL NEGOTIATION CLOSED_WON CLOSED_LOST }
enum ActivityType { CALL EMAIL MEETING NOTE TASK }
```

### 6.2 Server Module

`apps/server/src/modules/crm/`
- `crm.module.ts`
- `crm.service.ts`
- `crm.controller.ts`
- Routes: Full CRUD for contacts, deals, activities + `GET /crm/pipeline` (deals grouped by stage) + `GET /crm/upcoming-activities`

### 6.3 UI Pages

**Contacts List** (`/dashboard/crm`):
- Kanban-style stage view OR table toggle
- Search by name/email/company
- Filter by owner, stage, tag
- Add Contact → sheet form

**Deal Pipeline** (`/dashboard/crm/pipeline`):
- Kanban board (drag-and-drop with `@hello-pangea/dnd`)
- Columns: Prospect → Proposal → Negotiation → Won/Lost
- Deal cards: title, value, probability %, company name, avatar
- Drag updates stage via `PATCH /crm/deals/:id`

**Contact Detail** (`/dashboard/crm/contacts/[id]`):
- Profile header (name, company, stage badge)
- Activity timeline (calls, emails, meetings, notes)
- Associated deals
- Add activity form
- AI summary button → calls AI chat with contact context

---

## 7. New Module — HRMS (`/dashboard/hrms`)

> New backend module + Prisma models.

### 7.1 Prisma Schema Addition

```prisma
model Employee {
  id            String   @id @default(cuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id])
  userId        String?  @unique  // optional link to platform User
  employeeCode  String
  firstName     String
  lastName      String
  email         String
  phone         String?
  department    String?
  designation   String?
  managerId     String?
  manager       Employee? @relation("Reports", fields: [managerId], references: [id])
  reports       Employee[] @relation("Reports")
  hireDate      DateTime
  status        EmployeeStatus @default(ACTIVE)
  salary        Decimal? @db.Decimal(10,2)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  leaveRequests LeaveRequest[]
  attendance    AttendanceRecord[]
}

model LeaveRequest {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  type        LeaveType   // ANNUAL | SICK | UNPAID | MATERNITY | PATERNITY
  startDate   DateTime
  endDate     DateTime
  days        Int
  reason      String?
  status      LeaveStatus @default(PENDING)
  approvedBy  String?
  createdAt   DateTime @default(now())
}

model AttendanceRecord {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  date        DateTime @db.Date
  checkIn     DateTime?
  checkOut    DateTime?
  status      AttendanceStatus @default(PRESENT)
}

enum EmployeeStatus   { ACTIVE INACTIVE TERMINATED }
enum LeaveType        { ANNUAL SICK UNPAID MATERNITY PATERNITY }
enum LeaveStatus      { PENDING APPROVED REJECTED CANCELLED }
enum AttendanceStatus { PRESENT ABSENT HALF_DAY HOLIDAY LEAVE }
```

### 7.2 Server Module

`apps/server/src/modules/hrms/`
- `hrms.module.ts`
- `hrms.service.ts`
- `hrms.controller.ts`
- Routes: CRUD employees, CRUD leave requests + approve/reject, attendance mark + report, `GET /hrms/org-chart`, `GET /hrms/headcount`

### 7.3 UI Pages

**Employee Directory** (`/dashboard/hrms`):
- Grid card view (avatar, name, designation, department) + table toggle
- Filter by department, status
- Search
- Add Employee → sheet form

**Org Chart** (`/dashboard/hrms/org-chart`):
- Interactive tree using `react-d3-tree` or custom SVG
- Click node → employee detail sidebar

**Leave Management** (`/dashboard/hrms/leaves`):
- Pending requests table with Approve / Reject actions
- Leave balance summary per employee
- Monthly leave calendar heatmap

**Employee Detail** (`/dashboard/hrms/employees/[id]`):
- Profile card (photo placeholder, contact info, department)
- Attendance summary (30-day heatmap)
- Leave history
- Edit form
- Reporting chain (manager + direct reports)

---

## 8. Premium Component Library (Shared)

These components are used across all modules. Build once, use everywhere.

### 8.1 DataTable

**File:** `apps/web/components/ui/data-table.tsx`

- Built on `@tanstack/react-table` v8
- Features: column sorting, column visibility toggle, global search, pagination, row selection, bulk actions bar (appears on selection)
- Loading state: skeleton rows
- Empty state: illustration + CTA button
- Export: CSV download from current filtered data

### 8.2 StatsCard

**File:** `apps/web/components/ui/stats-card.tsx`

Props: `title`, `value`, `trend` (number), `trendLabel`, `icon`, `gradient`  
Animated counter on mount. Trend pill auto-colors.

### 8.3 PageHeader

**File:** `apps/web/components/ui/page-header.tsx`

Props: `title`, `description`, `actions` (ReactNode), `breadcrumb`  
Sticky on scroll with subtle border appear animation.

### 8.4 Sheet Form

**File:** `apps/web/components/ui/sheet-form.tsx`

Right-side `<Sheet>` wrapper for create/edit forms.  
Props: `title`, `description`, `children`, `onSubmit`, `isLoading`  
Footer: Cancel + Submit buttons with loading spinner.

### 8.5 EmptyState

**File:** `apps/web/components/ui/empty-state.tsx`

Props: `icon`, `title`, `description`, `action`  
Used when DataTable has no rows.

### 8.6 ConfirmDialog

**File:** `apps/web/components/ui/confirm-dialog.tsx`

Destructive action confirmation. Props: `title`, `description`, `onConfirm`, `isLoading`.  
Button text: "Delete" in red.

### 8.7 LoadingScreen

**File:** `apps/web/components/ui/loading-screen.tsx`

Full-page skeleton used during `Suspense` boundaries. Matches current page layout (sidebar + topbar shimmer + content shimmer).

### 8.8 Toaster

Use `sonner` (already in shadcn stack). Standardise all toast calls:
```ts
toast.success('Member invited')
toast.error('Failed to delete item')
toast.loading('Generating report...')
```
Position: `bottom-right`.

---

## 9. Existing Page Upgrades

Apply the premium shell + new components to all existing dashboard pages without changing functionality.

| Route | Upgrades |
|-------|---------|
| `/dashboard/billing` | StatsCard row (MRR, ARR, Outstanding, Next Payment), invoice DataTable with export |
| `/dashboard/members` | Avatar grid toggle + DataTable, role filter chip bar |
| `/dashboard/products` | Card grid + DataTable toggle, status badge colors |
| `/dashboard/subscriptions` | Timeline view of subscription lifecycle, status chips |
| `/dashboard/reports` | Chart grid using recharts, date range picker, export PDF button |
| `/dashboard/audit-logs` | Infinite scroll DataTable, actor filter, action type filter |
| `/dashboard/files` | File grid with thumbnail preview (images), list toggle, drag-and-drop upload zone |
| `/dashboard/integrations` | Card grid with connected/disconnected status, OAuth connect button |
| `/dashboard/developer` | Code snippet copy blocks, API key masked display with reveal toggle |
| `/dashboard/notifications` | Mark all read, filter by type, SSE live badge on bell |
| `/dashboard/settings` | Tabbed settings (Profile / Organization / Security / Danger Zone) |

---

## 10. Animations & Motion

**Library:** `framer-motion`

Rules:
- Page transitions: `opacity 0→1` + `translateY 8px→0`, 200ms ease-out
- Card mount: stagger children with `delayChildren: 0.05`
- Sidebar collapse: `layout` prop handles width smoothly
- Modal/Sheet: Framer Motion variants, not CSS only
- Number counters: `useSpring` from Framer Motion
- Do NOT animate on every re-render — only on mount/enter

---

## 11. Keyboard Shortcuts Reference

Display in a modal via `?` key or via Command Palette → "Keyboard Shortcuts".

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `⌘K` | Open Command Palette |
| `Ctrl+/` / `⌘/` | Open AI Chat |
| `?` | Show keyboard shortcuts |
| `G then D` | Go to Dashboard |
| `G then B` | Go to Billing |
| `G then M` | Go to Members |
| `G then I` | Go to Inventory |
| `G then C` | Go to CRM |
| `G then H` | Go to HRMS |
| `Esc` | Close any modal/drawer |

Use a global `useKeyboardShortcuts` hook in the root layout.

---

## 12. Performance Requirements

- **LCP < 2.5s** on dashboard home
- **INP < 200ms** for all interactions
- All DataTables must use **server-side pagination** for tables > 100 rows
- Use `React.lazy` + `Suspense` for: Command Palette, AI Chat Drawer, Charts, Org Chart
- Images: use `next/image` with blur placeholder
- Fonts: `next/font` with `display: swap`
- Bundle: run `next build --analyze` and ensure no single chunk > 250kb gzip

---

## 13. Accessibility (a11y)

- All interactive elements: keyboard focusable, visible focus ring
- Command Palette: full ARIA roles (`role="dialog"`, `aria-label`)
- Color contrast: all text minimum WCAG AA (4.5:1)
- Sidebar collapse: announce state change to screen readers via `aria-expanded`
- Charts: provide `aria-label` or hidden data table fallback
- Toast notifications: use `role="status"` or `role="alert"` appropriately

---

## 14. File Structure Summary

```
apps/web/
├── app/
│   ├── (platform)/dashboard/
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── crm/
│   │   │   ├── page.tsx
│   │   │   ├── pipeline/page.tsx
│   │   │   └── contacts/[id]/page.tsx
│   │   └── hrms/
│   │       ├── page.tsx
│   │       ├── org-chart/page.tsx
│   │       ├── leaves/page.tsx
│   │       └── employees/[id]/page.tsx
│   └── api/
│       └── ai-chat/route.ts
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── app-shell.tsx
│   ├── command-palette/
│   │   └── index.tsx
│   ├── ai-chat/
│   │   └── index.tsx
│   └── ui/
│       ├── data-table.tsx
│       ├── stats-card.tsx
│       ├── page-header.tsx
│       ├── sheet-form.tsx
│       ├── empty-state.tsx
│       ├── confirm-dialog.tsx
│       └── loading-screen.tsx

apps/server/src/modules/
├── inventory/
│   ├── inventory.module.ts
│   ├── inventory.service.ts
│   └── inventory.controller.ts
├── crm/
│   ├── crm.module.ts
│   ├── crm.service.ts
│   └── crm.controller.ts
└── hrms/
    ├── hrms.module.ts
    ├── hrms.service.ts
    └── hrms.controller.ts
```

---

## 15. Dependencies to Install

```bash
# Frontend
npm install cmdk framer-motion @tanstack/react-table sonner react-markdown rehype-highlight @hello-pangea/dnd react-d3-tree next-themes date-fns

# Already in shadcn stack (verify, do not reinstall):
# tailwindcss, @radix-ui/*, clsx, class-variance-authority, recharts

# Backend (new modules only need Prisma + existing NestJS stack)
# No new server dependencies required
```

---

## 16. Environment Variables Required

```env
# .env (web)
ANTHROPIC_API_KEY=sk-ant-...        # For AI Chat drawer
NEXT_PUBLIC_APP_NAME="YourPlatform"
NEXT_PUBLIC_APP_URL=https://...

# Already present (from earlier phases):
NEXT_PUBLIC_API_URL=...
```

---

## 17. Acceptance Criteria

- [ ] Sidebar collapses to icon rail, state persists on refresh
- [ ] `Ctrl+K` opens Command Palette from any page
- [ ] Command Palette fuzzy-searches all commands and navigates correctly
- [ ] AI Chat drawer slides in, streams responses, shows page-contextual suggestions
- [ ] Dashboard home shows live KPI cards and charts
- [ ] Inventory module: CRUD items, movement history, low-stock badge
- [ ] CRM module: contact list, Kanban pipeline, deal drag-and-drop updates stage
- [ ] HRMS module: employee directory, org chart, leave approve/reject
- [ ] All existing pages upgraded with PageHeader + DataTable + new shell
- [ ] Dark mode works across all pages and new modules
- [ ] All keyboard shortcuts functional
- [ ] Mobile responsive: sidebar becomes bottom sheet or hamburger drawer on < 768px
- [ ] LCP < 2.5s on dashboard verified with Lighthouse

---

*End of Phase 25 spec. Hand this document to the AI agent with repo access. Start with §0 (tokens) → §1 (shell) → §2 (command palette) → §3 (AI chat) → then modules in order.*
