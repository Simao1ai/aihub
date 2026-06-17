const GRAPH = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION ?? "v21.0"}`;

async function graphGet(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const json = await res.json() as any;
  if (!res.ok || json.error)
    throw new Error(`Graph GET ${path} failed: ${JSON.stringify(json.error ?? json)}`);
  return json;
}

async function graphPost(path: string, body: Record<string, string>): Promise<any> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json() as any;
  if (!res.ok || json.error)
    throw new Error(`Graph POST ${path} failed: ${JSON.stringify(json.error ?? json)}`);
  return json;
}

export async function getLongLivedUserToken(shortToken: string): Promise<string> {
  const json = await graphGet("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  });
  return json.access_token as string;
}

export async function getPageToken(longLivedUserToken: string): Promise<string> {
  const pageId = process.env.FB_PAGE_ID!;
  const json = await graphGet(`${pageId}`, {
    fields: "access_token",
    access_token: longLivedUserToken,
  });
  if (!json.access_token)
    throw new Error("No Page access token returned — check that the user admins this Page.");
  return json.access_token as string;
}

export interface TokenInfo {
  isValid: boolean;
  expiresAt: number | null;
  scopes: string[];
}

export async function inspectToken(inputToken: string): Promise<TokenInfo> {
  const appAccessToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const json = await graphGet("debug_token", {
    input_token: inputToken,
    access_token: appAccessToken,
  });
  const d = json.data ?? {};
  return {
    isValid: Boolean(d.is_valid),
    expiresAt: typeof d.expires_at === "number" ? d.expires_at : null,
    scopes: Array.isArray(d.scopes) ? d.scopes : [],
  };
}

export interface PublishResult {
  id: string;
  permalink?: string;
}

export async function publishToPage(message: string, pageToken: string): Promise<PublishResult> {
  const pageId = process.env.FB_PAGE_ID!;
  const json = await graphPost(`${pageId}/feed`, {
    message,
    access_token: pageToken,
  });
  return { id: json.id as string };
}
