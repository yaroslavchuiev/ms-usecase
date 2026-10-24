import "server-only";

// Salesforce settings come from environment variables only (set in .env.local locally and in
// Vercel project settings when deployed). Nothing about the org is hardcoded.

export interface SalesforceConfig {
  instanceUrl: string; // org My Domain URL, no trailing slash
  apiVersion: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Base URL for links that open Salesforce in the user's browser, or null when it isn't configured
 * (mock mode without SALESFORCE_INSTANCE_URL). Unlike the credentials, this URL is not secret:
 * staff open Salesforce with it anyway.
 */
export function getSalesforceBaseUrl(): string | null {
  try {
    const url = new URL(process.env.SALESFORCE_INSTANCE_URL ?? "");
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function getSalesforceConfig(): SalesforceConfig {
  const env = process.env;
  const missing = ["SALESFORCE_INSTANCE_URL", "SF_CLIENT_ID", "SF_CLIENT_SECRET"].filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`DATA_MODE=live needs these environment variables: ${missing.join(", ")}`);

  const instanceUrl = new URL(env.SALESFORCE_INSTANCE_URL!);
  // The client secret is POSTed to this URL, so refuse plain http (except for a local fake in dev).
  if (instanceUrl.protocol !== "https:" && instanceUrl.hostname !== "localhost") {
    throw new Error("SALESFORCE_INSTANCE_URL must be an https URL");
  }
  return {
    instanceUrl: instanceUrl.origin,
    apiVersion: env.SF_API_VERSION || "v62.0",
    clientId: env.SF_CLIENT_ID!,
    clientSecret: env.SF_CLIENT_SECRET!,
  };
}
