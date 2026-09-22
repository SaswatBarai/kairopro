/**
 * DNS record management for a deployed subdomain (Phase 19 / BE-11).
 *
 * There is no real domain registrar wired into this environment (no
 * Route53/Cloudflare credentials), so — the same boundary
 * `platform/container`'s stub/real split documents — this is an interface
 * with only a stub implementation today. `deploy.service` depends on the
 * interface, so swapping in a real registrar client later touches only
 * `getDnsProvider`'s selector, nothing that calls it.
 */

export interface DnsRecord {
  subdomain: string;
  target: string;
}

export interface DnsProvider {
  /** Points `subdomain` at `target` (the host's public address). Idempotent:
   * creating the same record twice just replaces it. */
  createRecord(subdomain: string, target: string): Promise<DnsRecord>;
  /** Best-effort — removing a record that doesn't exist is not an error. */
  removeRecord(subdomain: string): Promise<void>;
}

/** In-memory only — records vanish on process restart. Safe for dev/test;
 * production requires a real registrar-backed `DnsProvider` this module
 * does not yet provide. */
export function createStubDnsProvider(): DnsProvider {
  const records = new Map<string, DnsRecord>();

  return {
    async createRecord(subdomain: string, target: string): Promise<DnsRecord> {
      const record: DnsRecord = { subdomain, target };
      records.set(subdomain, record);
      return record;
    },
    async removeRecord(subdomain: string): Promise<void> {
      records.delete(subdomain);
    },
  };
}

let cached: DnsProvider | undefined;

export function getDnsProvider(): DnsProvider {
  cached ??= createStubDnsProvider();
  return cached;
}
