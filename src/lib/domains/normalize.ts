const PLATFORM_HOSTS = new Set<string>([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
]);

const LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD_ALPHA_REGEX = /^[a-z]{2,63}$/i;
const TLD_PUNYCODE_REGEX = /^xn--[a-z0-9-]{1,59}$/i;

/**
 * Normalizes a raw host/URL string into a lowercase hostname without
 * protocol, userinfo, path/query/hash, port, or trailing dots.
 */
export function normalizeHostname(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let value = input.trim().toLowerCase();
  if (!value) {
    return "";
  }

  // Strip protocol (e.g. https://, http://) or protocol-relative prefix (//)
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^\/\//, "");

  // Strip path, query string, or hash fragment
  value = value.split(/[/?#]/)[0] || "";

  // Strip optional userinfo (user:pass@host)
  const atIndex = value.lastIndexOf("@");
  if (atIndex !== -1) {
    value = value.slice(atIndex + 1);
  }

  // Strip port while preserving bracketed IPv6 literals like [::1]:3000
  if (value.startsWith("[")) {
    value = value.replace(/\]:\d+$/, "]");
  } else {
    value = value.replace(/:\d+$/, "");
  }

  // Strip trailing dots (FQDN root dot)
  value = value.replace(/\.+$/, "");

  return value.trim();
}

/**
 * Validates an RFC-compliant domain/subdomain hostname.
 * Requires at least one dot, valid DNS labels, TLD >= 2 chars,
 * and rejects IP addresses, spaces, ports, paths, and slashes.
 */
export function isValidHostname(hostname: string): boolean {
  if (!hostname || typeof hostname !== "string") {
    return false;
  }

  if (hostname !== hostname.trim()) {
    return false;
  }

  // Reject whitespace, slashes, colons, brackets, query/hash/userinfo chars
  if (/[\s/\\:?#@[\]]/.test(hostname)) {
    return false;
  }

  if (hostname.length > 253 || !hostname.includes(".")) {
    return false;
  }

  if (hostname.startsWith(".") || hostname.endsWith(".") || hostname.includes("..")) {
    return false;
  }

  // Reject IPv4 addresses
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return false;
  }

  const labels = hostname.split(".");
  if (labels.length < 2) {
    return false;
  }

  for (const label of labels) {
    if (!label || label.length > 63 || !LABEL_REGEX.test(label)) {
      return false;
    }
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2) {
    return false;
  }

  return TLD_ALPHA_REGEX.test(tld) || TLD_PUNYCODE_REGEX.test(tld);
}

/**
 * Returns true if the given host resolves to a known platform/local host
 * rather than a tenant custom domain.
 */
export function isPlatformHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) {
    return false;
  }

  if (PLATFORM_HOSTS.has(normalized)) {
    return true;
  }

  const envPlatformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    ? normalizeHostname(process.env.NEXT_PUBLIC_PLATFORM_DOMAIN)
    : "";

  return Boolean(envPlatformDomain && normalized === envPlatformDomain);
}
