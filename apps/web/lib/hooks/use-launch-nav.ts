"use client";

import { toast } from "sonner";
import { useLaunchProduct } from "./use-products";
import { ApiClientError } from "../api-client";

export function useLaunchNav() {
  const launch = useLaunchProduct();

  function launchProduct(slug: string, label: string) {
    launch.mutate(slug, {
      onSuccess: (data) => {
        window.open(data.url, "_blank", "noopener,noreferrer");
      },
      onError: (err) => {
        if (err instanceof ApiClientError && err.status === 403) {
          toast.error(`No active subscription for ${label}`, {
            description: "Ask your org owner to subscribe from the Products page.",
          });
        } else {
          toast.error(`Couldn't launch ${label}`);
        }
      },
    });
  }

  return { launchProduct, isLaunching: launch.isPending };
}
