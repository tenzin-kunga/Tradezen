import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '0.0.0.0',
  '::1',
  '::',
  'metadata.google.internal',
  'metadata',
]);

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('::ffff:')) {
      return isPrivateIp(lower.replace('::ffff:', ''));
    }
  }
  return false;
}

/**
 * Rejects URLs that point at non-public hosts (loopback, private, link-local,
 * cloud metadata) to prevent server-side request forgery via user-supplied
 * provider base URLs. Resolves hostnames to catch DNS-based pivots.
 */
export async function assertPublicUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed');
  }
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error('URL points to a non-public host');
  }
  let addresses: string[];
  try {
    addresses = (await dns.lookup(hostname, { all: true })).map(
      (a) => a.address,
    );
  } catch {
    throw new Error('Unable to resolve URL host');
  }
  if (addresses.length === 0) {
    throw new Error('Unable to resolve URL host');
  }
  for (const addr of addresses) {
    if (isPrivateIp(addr)) {
      throw new Error('URL resolves to a non-public address');
    }
  }
}
