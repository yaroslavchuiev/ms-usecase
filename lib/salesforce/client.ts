import "server-only";
import { getSalesforceConfig } from "./config";
import type { SfQueryResult } from "./types";

// Minimal Salesforce REST client: OAuth client-credentials token (cached) + SOQL with paging.
// Runs on the server only; the browser never sees the token, the secret or raw responses.

export class SalesforceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// --- Token -------------------------------------------------------------------------------------
// Client credentials gives an access token but no refresh token: when it expires we simply ask
// again. The token lives in module memory, so each serverless instance fetches its own.

interface Token {
  value: string;
  expiresAt: number; // ms since epoch
}

const FALLBACK_LIFETIME_MS = 25 * 60_000; // the response may omit expires_in; assume less than the usual 30 min
const EXPIRY_MARGIN_MS = 60_000; // renew a little early
let cachedToken: Token | null = null;
let tokenRequest: Promise<Token> | null = null; // shared by concurrent callers: one request, not many

async function requestToken(): Promise<Token> {
  const { instanceUrl, clientId, clientSecret } = getSalesforceConfig();
  const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
  });
  if (!res.ok) throw new SalesforceError(`Salesforce token request failed (HTTP ${res.status})`, res.status);

  const body = (await res.json()) as { access_token: string; expires_in?: number };
  const lifetime = body.expires_in ? body.expires_in * 1000 : FALLBACK_LIFETIME_MS;
  return { value: body.access_token, expiresAt: Date.now() + lifetime - EXPIRY_MARGIN_MS };
}

async function getToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  tokenRequest ??= requestToken().finally(() => (tokenRequest = null));
  cachedToken = await tokenRequest;
  return cachedToken.value;
}

// --- Queries -----------------------------------------------------------------------------------

async function describeError(res: Response): Promise<string> {
  try {
    const [first] = (await res.json()) as { errorCode?: string; message?: string }[];
    return `${first?.errorCode ?? "ERROR"}: ${first?.message ?? res.statusText}`;
  } catch {
    return res.statusText;
  }
}

async function send<T>(method: "GET" | "POST" | "PATCH", url: string, body?: object): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const token = await getToken(attempt > 0);
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body && { "Content-Type": "application/json" }) },
      body: body && JSON.stringify(body),
      cache: "no-store",
    });
    // 401 = token expired or revoked before our clock noticed: get a new one and retry once.
    if (res.status === 401 && attempt === 0) continue;
    if (!res.ok) throw new SalesforceError(`Salesforce ${method} failed (HTTP ${res.status}) ${await describeError(res)}`, res.status);
    return (res.status === 204 ? undefined : await res.json()) as T; // PATCH answers 204 No Content
  }
}

/** Runs a SOQL query and follows `nextRecordsUrl` until every page is loaded (2000 rows/page). */
export async function query<T>(soql: string): Promise<T[]> {
  const { instanceUrl, apiVersion } = getSalesforceConfig();
  const records: T[] = [];
  let url: string | null = `${instanceUrl}/services/data/${apiVersion}/query?q=${encodeURIComponent(soql)}`;
  while (url) {
    const page: SfQueryResult<T> = await send("GET", url);
    records.push(...page.records);
    url = !page.done && page.nextRecordsUrl ? instanceUrl + page.nextRecordsUrl : null;
  }
  return records;
}

// --- Writes (the only ones in the app: reception logs and collects deliveries) ---------------------
// The integration user needs create/edit permission on that one object, nothing else.

/** Creates a record and returns its new Id. `sobject` is a constant from our code, never user input. */
export async function createRecord(sobject: string, fields: object): Promise<string> {
  const { instanceUrl, apiVersion } = getSalesforceConfig();
  const result = await send<{ id: string; success: boolean }>("POST", `${instanceUrl}/services/data/${apiVersion}/sobjects/${sobject}`, fields);
  return result.id;
}

export async function updateRecord(sobject: string, id: string, fields: object): Promise<void> {
  const { instanceUrl, apiVersion } = getSalesforceConfig();
  await send<void>("PATCH", `${instanceUrl}/services/data/${apiVersion}/sobjects/${sobject}/${id}`, fields);
}
