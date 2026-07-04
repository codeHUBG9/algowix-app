import { ValidationError } from "./errors.js";

// 22-Security.md §3.3 — SSRF prevention for user-supplied URLs the server
// will later make outbound requests to (webhook delivery, integration OAuth
// callbacks). Blocks the obvious loopback/link-local/metadata hosts and the
// private CIDR ranges by literal IP check — good enough without pulling in a
// DNS-resolving IP-range library, since the doc's own sample is this same
// hostname/IP-literal check (real hardening would also resolve the hostname
// and re-check, to stop DNS-rebinding, but that's beyond what's exercised here).
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "169.254.169.254"]);

function isPrivateIPv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  return false;
}

export function assertPublicHttpsUrl(url: string, fieldLabel = "URL"): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError(`${fieldLabel} is not a valid URL`);
  }

  if (parsed.protocol !== "https:") {
    throw new ValidationError(`${fieldLabel} must use HTTPS`);
  }
  if (BLOCKED_HOSTS.has(parsed.hostname) || isPrivateIPv4(parsed.hostname)) {
    throw new ValidationError(`${fieldLabel} cannot point to an internal or private host`);
  }
}
