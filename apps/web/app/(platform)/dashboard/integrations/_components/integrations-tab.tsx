"use client";

import { Plug, Check } from "lucide-react";
import { Card, Badge, Button } from "../../../_components/ui";
import { useIntegrations, useConnectIntegration, useDisconnectIntegration } from "../../../../../lib/hooks/use-integrations";

export function IntegrationsTab() {
  const { data, isLoading } = useIntegrations();
  const connect = useConnectIntegration();
  const disconnect = useDisconnectIntegration();

  if (isLoading) return <p className="py-8 text-center text-sm text-slate-400">Loading...</p>;

  const categories = [...new Set(data?.map((i) => i.category))];

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{category}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data
              ?.filter((i) => i.category === category)
              .map((integration) => (
                <Card key={integration.provider} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Plug size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{integration.name}</p>
                        {integration.status === "CONNECTED" && (
                          <Badge tone="green">
                            <Check size={10} className="mr-1 inline" /> Connected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={integration.status === "CONNECTED" ? "secondary" : "primary"}
                    className="mt-3 w-full justify-center"
                    disabled={connect.isPending || disconnect.isPending}
                    onClick={() =>
                      integration.status === "CONNECTED"
                        ? disconnect.mutate(integration.provider)
                        : connect.mutate(integration.provider)
                    }
                  >
                    {integration.status === "CONNECTED" ? "Disconnect" : "Connect"}
                  </Button>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
