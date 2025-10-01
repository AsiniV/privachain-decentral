// Domain resolution for .prv domains via blockchain
// import { cosmosClient } from '../../lib/cosmos' // TODO: Use when implementing actual blockchain query

// Environment-based configuration
const PRV_CONTRACT = import.meta.env.VITE_PRV_REGISTRY_CONTRACT; // set after deploy
const OFFCHAIN_MAP_CID = import.meta.env.VITE_PRV_OFFCHAIN_MAP_CID;
const LCD = import.meta.env.VITE_COSMOS_LCD || 'https://cosmoshub-testnet.api.kjnodes.com';

export interface PrvDomainRecord {
  domain: string
  cid: string
  owner?: string
  active: boolean
  expires: number
  contentType?: string
  encryptionKey?: string
}

/**
 * Resolve a .prv domain to its IPFS CID via blockchain query
 * @param domain - The .prv domain to resolve (e.g., "example.prv")
 * @returns Domain record with CID and metadata, or null if not found
 */
export async function resolvePrvDomain(domain: string): Promise<PrvDomainRecord | null> {
  // Try contract query first if configured
  if (PRV_CONTRACT) {
    const queryMsg = { get_record: { domain } };
    const base64Query = btoa(JSON.stringify(queryMsg));
    const url = `${LCD}/cosmwasm/wasm/v1/contract/${PRV_CONTRACT}/smart/${base64Query}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null; // Assume not found or error means no record
      }
      const { data } = await response.json();
      if (!data || !data.cid) {
        return null;
      }
      return { domain, ...data };
    } catch (error) {
      console.error(`Contract query failed: ${(error as Error).message}`);
      return null;
    }
  }

  // Fallback to offchain map
  if (OFFCHAIN_MAP_CID) {
    try {
      const response = await fetch(`https://ipfs.io/ipfs/${OFFCHAIN_MAP_CID}`);
      if (!response.ok) {
        throw new Error('Failed to fetch offchain map');
      }
      const map = await response.json();
      const rec = map[domain];
      if (!rec || !rec.cid) {
        return null;
      }
      return {
        domain,
        cid: rec.cid,
        active: !!rec.active,
        expires: rec.expires ?? (Date.now() + 86400_000), // Default to 1 day if not set
        contentType: rec.contentType,
        encryptionKey: rec.encryptionKey,
      };
    } catch (error) {
      console.error(`Offchain resolution failed: ${(error as Error).message}`);
      return null;
    }
  }

  // Development/testing fallback - mock data
  console.log(`🔍 Using mock data for .prv domain: ${domain}`);
  
  // Remove .prv suffix if present for lookup
  const domainName = domain.endsWith('.prv') ? domain.slice(0, -4) : domain;
  
  // Mock data for testing - replace with actual contract query in production
  const mockDomains: Record<string, Omit<PrvDomainRecord, 'domain'>> = {
    'example': {
      cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      owner: 'cosmos1...',
      active: true,
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year from now
    },
    'test': {
      cid: 'QmTest1234567890abcdefghijklmnopqrstuvwxyz',
      owner: 'cosmos1...',
      active: true,
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000
    }
  };
  
  const mockData = mockDomains[domainName];
  if (!mockData) {
    return null;
  }
  
  return {
    domain: `${domainName}.prv`,
    ...mockData
  };
}
