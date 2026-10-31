/**
 * Pretty-prints SSR pre-fetched payloads in the server terminal
 * so developers can inspect what data the server loaded during page rendering.
 */
export function logSsrData(pagePath: string, data: Record<string, any>) {
  const time = new Date().toLocaleTimeString();
  const magenta = '\x1b[35m';
  const cyan = '\x1b[36m';
  const gray = '\x1b[90m';
  const reset = '\x1b[0m';

  console.log(`\n${gray}[${time}]${reset} ${magenta}[SSR Data Pre-fetch]${reset} ${cyan}${pagePath}${reset}`);

  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      console.log(`  ${cyan}↳ ${key} (${val.length} items):${reset}`);
      console.dir(
        {
          count: val.length,
          sample: val.slice(0, 2),
          ...(val.length > 2 ? { remaining: `+${val.length - 2} more items` } : {}),
        },
        { depth: 4, colors: true }
      );
    } else {
      console.log(`  ${cyan}↳ ${key}:${reset}`);
      console.dir(val, { depth: 4, colors: true });
    }
  }
  console.log('');
}
