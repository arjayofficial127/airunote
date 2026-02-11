/**
 * Vercel API Service
 * Handles domain management via Vercel API
 */

interface VercelDomainConfig {
  records: Array<{
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    ttl?: number;
  }>;
}

interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified?: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
  config?: VercelDomainConfig;
}

interface AddDomainToVercelResult {
  success: boolean;
  domain: string;
  wwwDomain?: string;
  dnsRecords?: VercelDomainConfig['records'];
  error?: string;
}

export class VercelService {
  private apiToken: string;
  private projectId: string;
  private baseUrl = 'https://api.vercel.com';

  constructor() {
    this.apiToken = process.env.VERCEL_API_TOKEN || '';
    this.projectId = process.env.VERCEL_PROJECT_ID || '';

    if (!this.apiToken) {
      console.warn('[VercelService] VERCEL_API_TOKEN not set. Vercel integration will be disabled.');
    }
    if (!this.projectId) {
      console.warn('[VercelService] VERCEL_PROJECT_ID not set. Vercel integration will be disabled.');
    }
  }

  /**
   * Check if Vercel integration is configured
   */
  isConfigured(): boolean {
    return !!this.apiToken && !!this.projectId;
  }

  /**
   * Add domain to Vercel project
   * Adds both base domain and www version
   */
  async addDomain(domain: string): Promise<AddDomainToVercelResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        domain,
        error: 'Vercel integration not configured',
      };
    }

    const results: AddDomainToVercelResult = {
      success: true,
      domain,
    };

    try {
      // Add base domain (e.g., arvinjaysoncastro.com)
      const baseDomainResult = await this.addSingleDomain(domain);
      if (!baseDomainResult.success) {
        return {
          success: false,
          domain,
          error: baseDomainResult.error || 'Failed to add base domain to Vercel',
        };
      }

      // Add www version (e.g., www.arvinjaysoncastro.com)
      const wwwDomain = `www.${domain}`;
      const wwwDomainResult = await this.addSingleDomain(wwwDomain);
      if (wwwDomainResult.success) {
        results.wwwDomain = wwwDomain;
      } else {
        // www might already exist or fail, but base domain succeeded
        console.warn(`[VercelService] Failed to add www domain: ${wwwDomainResult.error}`);
      }

      // Get DNS configuration for base domain
      const dnsConfig = await this.getDomainConfig(domain);
      if (dnsConfig) {
        results.dnsRecords = dnsConfig.records;
      }

      return results;
    } catch (error: any) {
      console.error('[VercelService] Error adding domain:', error);
      return {
        success: false,
        domain,
        error: error.message || 'Unknown error adding domain to Vercel',
      };
    }
  }

  /**
   * Add a single domain to Vercel
   */
  private async addSingleDomain(domain: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.projectId}/domains`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: domain }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Domain might already exist (409 Conflict) - that's okay
        if (response.status === 409) {
          console.log(`[VercelService] Domain ${domain} already exists in Vercel`);
          return { success: true };
        }
        const errorData = data as { error?: { message?: string } };
        return {
          success: false,
          error: errorData.error?.message || `Vercel API error: ${response.status}`,
        };
      }

      console.log(`[VercelService] Successfully added domain ${domain} to Vercel`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add domain to Vercel',
      };
    }
  }

  /**
   * Get DNS configuration for a domain
   */
  async getDomainConfig(domain: string): Promise<VercelDomainConfig | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.projectId}/domains/${domain}/config`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(`[VercelService] Failed to get DNS config for ${domain}: ${response.status}`);
        return null;
      }

      const data = await response.json() as VercelDomainResponse;
      return data.config || null;
    } catch (error: any) {
      console.error(`[VercelService] Error getting DNS config for ${domain}:`, error);
      return null;
    }
  }

  /**
   * Get domain status
   */
  async getDomainStatus(domain: string): Promise<{ verified: boolean; error?: string } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.projectId}/domains/${domain}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      if (!response.ok) {
        return { verified: false, error: `Domain not found in Vercel: ${response.status}` };
      }

      const data = await response.json() as VercelDomainResponse;
      return { verified: data.verified || false };
    } catch (error: any) {
      return { verified: false, error: error.message };
    }
  }
}
