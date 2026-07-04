"use client";

import { useState } from "react";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "../../../../../lib/hooks/use-api-keys";
import { ApiClientError } from "../../../../../lib/api-client";

const AVAILABLE_SCOPES = [
  "organization.read",
  "users.read",
  "subscriptions.read",
  "billing.read",
  "audit_logs.read",
  "reports.read",
  "webhooks.manage",
  "files.read",
] as const;

export function ApiKeysTab() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [error, setError] = useState<string | null>(null);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  function toggleScope(scope: string) {
    setScopes((current) => (current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope]));
  }

  async function onCreate() {
    setError(null);
    if (!name.trim() || scopes.length === 0) {
      setError("Name and at least one scope are required");
      return;
    }
    try {
      const key = await createKey.mutateAsync({ name: name.trim(), scopes, environment });
      setNewRawKey(key.rawKey);
      setName("");
      setScopes([]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onRevoke(keyId: string) {
    try {
      await revokeKey.mutateAsync(keyId);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {newRawKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Copy your API key now — you won't see it again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-white px-2 py-1 text-xs">{newRawKey}</code>
            <button
              onClick={() => navigator.clipboard.writeText(newRawKey)}
              className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white"
            >
              Copy
            </button>
          </div>
          <button onClick={() => setNewRawKey(null)} className="mt-2 text-xs text-amber-700 underline">
            Done
          </button>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-700">Create API key</h2>
        <div className="mt-3 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. CI pipeline)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SCOPES.map((scope) => (
              <label key={scope} className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />
                {scope}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="font-medium">Environment</span>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={environment === "live"} onChange={() => setEnvironment("live")} />
              Live
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={environment === "test"} onChange={() => setEnvironment("test")} />
              Test (sandbox)
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={onCreate}
            disabled={createKey.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {createKey.isPending ? "Creating..." : "Create key"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-700">API keys</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {keys?.map((key) => (
              <li key={key.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium">{key.name}</span>{" "}
                  <span className="text-slate-400">· {key.keyPrefix}...</span>
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      key.environment === "test" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {key.environment}
                  </span>
                  {!key.isActive && <span className="ml-2 text-xs text-red-600">Revoked</span>}
                  <p className="text-xs text-slate-400">
                    {key.scopes.join(", ")}
                    {key.lastUsedAt ? ` · last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : " · never used"}
                  </p>
                </div>
                {key.isActive &&
                  (revokingId === key.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onRevoke(key.id)}
                        disabled={revokeKey.isPending}
                        className="text-xs font-medium text-red-600"
                      >
                        Confirm
                      </button>
                      <button onClick={() => setRevokingId(null)} className="text-xs text-slate-500">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setRevokingId(key.id)} className="text-xs font-medium text-red-600 underline">
                      Revoke
                    </button>
                  ))}
              </li>
            ))}
            {keys?.length === 0 && <p className="py-2 text-sm text-slate-500">No API keys yet.</p>}
          </ul>
        )}
      </div>
    </div>
  );
}
