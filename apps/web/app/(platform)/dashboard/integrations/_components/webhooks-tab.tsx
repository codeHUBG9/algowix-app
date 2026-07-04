"use client";

import { useState } from "react";
import { Plus, Trash2, Zap, ListTree, X } from "lucide-react";
import { Card, Badge, Button, EmptyState } from "../../../_components/ui";
import {
  useWebhooks,
  useWebhookEvents,
  useCreateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useWebhookDeliveries,
} from "../../../../../lib/hooks/use-webhooks";
import { ApiClientError } from "../../../../../lib/api-client";

function DeliveriesPanel({ webhookId, onClose }: { webhookId: string; onClose: () => void }) {
  const { data: deliveries, isLoading } = useWebhookDeliveries(webhookId);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Delivery log</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>
      {isLoading && <p className="mt-3 text-sm text-slate-400">Loading...</p>}
      {!isLoading && deliveries?.length === 0 && <p className="mt-3 text-sm text-slate-400">No deliveries yet.</p>}
      <ul className="mt-3 divide-y divide-slate-50">
        {deliveries?.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-2 text-sm">
            <span className="font-mono text-xs text-slate-600">{d.eventType}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleString()}</span>
              <Badge tone={d.success ? "green" : "red"}>{d.statusCode ?? "failed"}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function WebhooksTab() {
  const { data: webhooks, isLoading } = useWebhooks();
  const { data: events } = useWebhookEvents();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingDeliveries, setViewingDeliveries] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  function toggleEvent(event: string) {
    setSelectedEvents((cur) => (cur.includes(event) ? cur.filter((e) => e !== event) : [...cur, event]));
  }

  async function onCreate() {
    setError(null);
    try {
      const webhook = await createWebhook.mutateAsync({ name, url, events: selectedEvents });
      setNewSecret(webhook.secret);
      setName("");
      setUrl("");
      setSelectedEvents([]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function onTest(id: string) {
    const result = await testWebhook.mutateAsync(id);
    setTestResult((cur) => ({ ...cur, [id]: result.success ? `✓ ${result.statusCode}` : "✗ failed" }));
  }

  return (
    <div className="space-y-4">
      {newSecret && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Copy your webhook secret now — you won't see it again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs">{newSecret}</code>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(newSecret)}>
              Copy
            </Button>
          </div>
          <button onClick={() => setNewSecret(null)} className="mt-2 text-xs text-amber-700 underline">
            Done
          </button>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} /> New webhook
        </Button>
      </div>

      {showForm && (
        <Card className="space-y-3 p-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Webhook name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-app.example.com/webhooks/algowix"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {events?.map((event) => (
              <label key={event} className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={selectedEvents.includes(event)} onChange={() => toggleEvent(event)} />
                {event}
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button onClick={onCreate} disabled={createWebhook.isPending || !name || !url || selectedEvents.length === 0}>
            {createWebhook.isPending ? "Creating..." : "Create webhook"}
          </Button>
        </Card>
      )}

      <Card>
        {isLoading && <p className="px-4 py-8 text-center text-sm text-slate-400">Loading...</p>}
        {!isLoading && webhooks?.length === 0 && (
          <EmptyState title="No webhooks configured" description="Create one to receive real-time events." />
        )}
        <ul className="divide-y divide-slate-50">
          {webhooks?.map((w) => (
            <li key={w.id} className="px-5 py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{w.name}</p>
                  <p className="truncate text-xs text-slate-400">{w.url}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.events.map((e) => (
                      <Badge key={e}>{e}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {testResult[w.id] && <span className="text-xs text-slate-500">{testResult[w.id]}</span>}
                  <button
                    onClick={() => onTest(w.id)}
                    title="Send test event"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                  >
                    <Zap size={15} />
                  </button>
                  <button
                    onClick={() => setViewingDeliveries(w.id)}
                    title="View deliveries"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                  >
                    <ListTree size={15} />
                  </button>
                  <button
                    onClick={() => deleteWebhook.mutate(w.id)}
                    title="Delete"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {viewingDeliveries && <DeliveriesPanel webhookId={viewingDeliveries} onClose={() => setViewingDeliveries(null)} />}
    </div>
  );
}
