/**
 * Shared price formatter for portal listings
 * Formats numbers into Lakhs (L) and Crores (Cr) with Indian numbering style
 */
export function formatPrice(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "Price on Request";
  }

  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹ ${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }

  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `₹ ${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)} L`;
  }

  return `₹ ${amount.toLocaleString("en-IN")}`;
}

/**
 * Shared ordinal formatter for floor numbering (e.g. 1st, 2nd, 3rd, 4th...)
 * Fixes the "1th / 2th Floor" bug.
 */
export function formatFloorOrdinal(num: number): string {
  if (num === 0) return "Ground Floor";
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return `${num}st Floor`;
  }
  if (j === 2 && k !== 12) {
    return `${num}nd Floor`;
  }
  if (j === 3 && k !== 13) {
    return `${num}rd Floor`;
  }
  return `${num}th Floor`;
}

/**
 * Tenant resolution helper for public portal queries and links
 */
export function resolveTenantContext(searchParams: {
  [key: string]: string | string[] | undefined;
}) {
  const agency =
    typeof searchParams.agency === "string" ? searchParams.agency : undefined;
  const adminId =
    typeof searchParams.adminId === "string" ? searchParams.adminId : undefined;
  return { agency, adminId };
}

/**
 * Builds query string preserving tenant parameters (?agency= or ?adminId=)
 * Correctly handles paths that already have query parameters (e.g. "/portal-properties?transactionType=Sale")
 */
export function appendTenantQuery(
  basePath: string,
  tenant: { agency?: string; adminId?: string },
): string {
  const [pathname, existingQuery] = basePath.split("?");
  const params = new URLSearchParams(existingQuery || "");

  if (tenant.agency) params.set("agency", tenant.agency);
  if (tenant.adminId) params.set("adminId", tenant.adminId);

  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}
