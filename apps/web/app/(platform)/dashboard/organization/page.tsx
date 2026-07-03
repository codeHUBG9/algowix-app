"use client";

import { useState } from "react";
import { BranchesTab } from "./_components/branches-tab";
import { DepartmentsTab } from "./_components/departments-tab";
import { TeamsTab } from "./_components/teams-tab";

const TABS = ["Branches", "Departments", "Teams"] as const;
type Tab = (typeof TABS)[number];

export default function OrganizationPage() {
  const [tab, setTab] = useState<Tab>("Branches");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Organization structure</h1>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Branches" && <BranchesTab />}
      {tab === "Departments" && <DepartmentsTab />}
      {tab === "Teams" && <TeamsTab />}
    </div>
  );
}
