/**
 * Formats a date into a deterministic DD/MM/YYYY format across both server and client
 * to prevent SSR hydration mismatches.
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return 'N/A';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const [y, m, d] = date.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} UTC`;
}
