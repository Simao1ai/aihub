import { Router, type IRouter } from "express";
import { db, connectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import nodemailer from "nodemailer";

// Read workspace from X-Workspace header (falls back to 'general')
function getWorkspace(req: any): string {
  return (req.headers["x-workspace"] as string) || "general";
}

const router: IRouter = Router();

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  linkedin: "LinkedIn",
  google: "Google / Gmail",
  twitter: "Twitter / X",
  meta: "Meta (Instagram & Facebook)",
  gohighlevel: "GoHighLevel CRM",
  email: "Email Account",
  smtp: "SMTP Email",
  twilio: "Twilio SMS",
  commhub: "CommHub SMS",
  mailbase: "MailBase Email",
};

const COMMHUB_BASE = "https://commhub.replit.app";
const MAILBASE_BASE = "https://mail-base-platform.replit.app";

const OAUTH_PLATFORMS = ["linkedin", "google", "twitter", "meta"];

// ── CommHub proxy routes (no auth stored) ─────────────────────────────────────

router.post("/proxy/commhub/businesses", async (req, res) => {
  try {
    const { adminUser, adminPass } = req.body;
    if (!adminUser || !adminPass) return res.status(400).json({ error: "adminUser and adminPass required" });
    const auth = Buffer.from(`${adminUser}:${adminPass}`).toString("base64");
    const resp = await fetch(`${COMMHUB_BASE}/api/businesses/`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (resp.status === 401) return res.status(401).json({ error: "Invalid CommHub credentials" });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to reach CommHub" });
  }
});

router.post("/proxy/commhub/apikey", async (req, res) => {
  try {
    const { adminUser, adminPass, businessId } = req.body;
    if (!adminUser || !adminPass || !businessId) return res.status(400).json({ error: "Missing required fields" });
    const auth = Buffer.from(`${adminUser}:${adminPass}`).toString("base64");
    const resp = await fetch(`${COMMHUB_BASE}/api/businesses/${businessId}/credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!resp.ok) return res.status(401).json({ error: "Failed to fetch API key" });
    const data = await resp.json() as { api_key: string };
    res.json({ apiKey: data.api_key });
  } catch (err) {
    res.status(500).json({ error: "Failed to reach CommHub" });
  }
});

// ── MailBase proxy routes ─────────────────────────────────────────────────────

router.post("/proxy/mailbase/tenants", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: "apiKey required" });
    const resp = await fetch(`${MAILBASE_BASE}/api/tenants`, {
      headers: { "x-api-key": apiKey },
    });
    if (resp.status === 401) return res.status(401).json({ error: "Invalid MailBase API key" });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to reach MailBase" });
  }
});

// List connections — scoped to the calling workspace
router.get("/", async (req, res) => {
  try {
    const ws = getWorkspace(req);
    const conns = await db.select().from(connectionsTable)
      .where(eq(connectionsTable.workspaceSlug, ws))
      .orderBy(connectionsTable.platform);
    const sanitized = conns.map(({ accessToken, refreshToken, apiKey, ...safe }) => ({
      ...safe,
      hasToken: !!(accessToken || apiKey),
    }));
    res.json(sanitized);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch connections" });
  }
});

// Create API key connection — scoped to the calling workspace
router.post("/", async (req, res) => {
  try {
    const ws = getWorkspace(req);
    const { platform, apiKey, accountLabel, metadata } = req.body;

    const [conn] = await db.insert(connectionsTable).values({
      workspaceSlug: ws,
      platform,
      displayName: PLATFORM_DISPLAY_NAMES[platform] || platform,
      accountLabel,
      authType: "api_key",
      apiKey,
      scopes: [],
      metadata,
      isConnected: true,
    }).returning();

    const { accessToken, refreshToken, apiKey: key, ...safe } = conn;
    res.status(201).json({ ...safe, hasToken: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create connection" });
  }
});

// Delete/disconnect
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(connectionsTable).where(eq(connectionsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Connection not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete connection" });
  }
});

// Test connection
router.post("/:id/test", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conn] = await db.select().from(connectionsTable).where(eq(connectionsTable.id, id));
    if (!conn) return res.status(404).json({ error: "Connection not found" });

    // Platform-specific tests
    if (conn.platform === "gohighlevel" && conn.apiKey) {
      const resp = await fetch("https://rest.gohighlevel.com/v1/contacts/?limit=1", {
        headers: { Authorization: `Bearer ${conn.apiKey}` },
      });
      if (resp.ok) {
        res.json({ success: true, message: "GoHighLevel connection verified" });
      } else {
        res.json({ success: false, message: "GoHighLevel API key invalid or expired" });
      }
    } else if (conn.platform === "google" && conn.accessToken) {
      const resp = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
        headers: { Authorization: `Bearer ${conn.accessToken}` },
      });
      if (resp.ok) {
        const info = await resp.json() as Record<string, unknown>;
        res.json({ success: true, message: "Google connection verified", accountInfo: { email: info.email } });
      } else {
        res.json({ success: false, message: "Google token expired. Please reconnect." });
      }
    } else if (conn.platform === "linkedin" && conn.accessToken) {
      const resp = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${conn.accessToken}` },
      });
      if (resp.ok) {
        res.json({ success: true, message: "LinkedIn connection verified" });
      } else {
        res.json({ success: false, message: "LinkedIn token expired. Please reconnect." });
      }
    } else if (conn.platform === "twitter" && conn.accessToken) {
      const resp = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${conn.accessToken}` },
      });
      if (resp.ok) {
        res.json({ success: true, message: "Twitter/X connection verified" });
      } else {
        res.json({ success: false, message: "Twitter/X token expired. Please reconnect." });
      }
    } else if (conn.platform === "smtp" && conn.apiKey) {
      const m = conn.metadata as Record<string, string> | null ?? {};
      try {
        const transporter = nodemailer.createTransport({
          host: m.host,
          port: parseInt(m.port || "587"),
          secure: parseInt(m.port || "587") === 465,
          auth: { user: m.username, pass: conn.apiKey },
        });
        await transporter.verify();
        res.json({ success: true, message: `SMTP verified — sending as ${m.fromAddress}` });
      } catch (e: any) {
        res.json({ success: false, message: `SMTP error: ${e.message || "Invalid credentials or host"}` });
      }
    } else if (conn.platform === "twilio" && conn.apiKey) {
      const m = conn.metadata as Record<string, string> | null ?? {};
      const accountSid = m.accountSid || "";
      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
        headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${conn.apiKey}`).toString("base64")}` },
      });
      if (resp.ok) {
        const data = await resp.json() as Record<string, unknown>;
        res.json({ success: true, message: `Twilio verified — account: ${data.friendly_name || accountSid}` });
      } else {
        res.json({ success: false, message: "Twilio credentials invalid — check your Account SID and Auth Token" });
      }
    } else if (conn.platform === "commhub" && conn.apiKey) {
      const resp = await fetch(`${COMMHUB_BASE}/api/v1/me`, {
        headers: { Authorization: `Bearer ${conn.apiKey}` },
      });
      if (resp.ok) {
        const data = await resp.json() as Record<string, unknown>;
        const name = (data as any).name || (data as any).business_name || "business";
        res.json({ success: true, message: `CommHub verified — connected to: ${name}` });
      } else {
        res.json({ success: false, message: "CommHub API key invalid or expired" });
      }
    } else if (conn.platform === "mailbase" && conn.apiKey) {
      const resp = await fetch(`${MAILBASE_BASE}/api/tenants`, {
        headers: { "x-api-key": conn.apiKey },
      });
      if (resp.ok) {
        res.json({ success: true, message: "MailBase API key verified" });
      } else {
        res.json({ success: false, message: "MailBase API key invalid" });
      }
    } else {
      res.json({ success: conn.isConnected, message: conn.isConnected ? "Connected" : "Not connected" });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to test connection" });
  }
});

// Check which platforms have credentials configured
router.get("/status", (req, res) => {
  res.json({
    meta: {
      configured: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
      envVars: ["META_APP_ID", "META_APP_SECRET"],
    },
    linkedin: {
      configured: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
      envVars: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    },
    google: {
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    },
    twitter: {
      configured: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
      envVars: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
    },
    tiktok: { configured: false, envVars: [] },
    gohighlevel: { configured: true, envVars: [] },
    email: { configured: true, envVars: [] },
    smtp: { configured: true, envVars: [] },
    twilio: { configured: true, envVars: [] },
    commhub: { configured: true, envVars: [] },
    mailbase: { configured: true, envVars: [] },
  });
});

// Initiate OAuth flow
router.get("/oauth/:platform/initiate", (req, res) => {
  const { platform } = req.params;

  // Guard: check credentials are configured before redirecting
  const credentialMap: Record<string, string[]> = {
    meta: ["META_APP_ID", "META_APP_SECRET"],
    linkedin: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    twitter: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
  };
  const required = credentialMap[platform] ?? [];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    return res.status(400).json({
      error: "OAuth credentials not configured",
      missing,
      message: `Please set the following environment variables in Replit Secrets: ${missing.join(", ")}`,
    });
  }

  const appBaseUrl = process.env.APP_BASE_URL;
  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const reqHost = req.get("x-forwarded-host") || req.get("host");
  const reqProto = req.get("x-forwarded-proto") || "https";
  const baseUrl = appBaseUrl
    || (reqHost ? `${reqProto}://${reqHost}` : null)
    || (replitDomain ? `https://${replitDomain}` : null)
    || "http://localhost";
  const redirectUri = `${baseUrl}/api/connections/oauth/${platform}/callback`;

  let authUrl = "";
  const ws = getWorkspace(req);
  // Encode workspace into state so the callback can associate the connection correctly
  let state = `${ws}|${Math.random().toString(36).substring(2)}`;

  if (platform === "linkedin") {
    const clientId = process.env.LINKEDIN_CLIENT_ID || "";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: "openid profile email w_member_social",
    });
    authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  } else if (platform === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
      access_type: "offline",
      state,
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  } else if (platform === "twitter") {
    const clientId = process.env.TWITTER_CLIENT_ID || "";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "tweet.read tweet.write users.read dm.read dm.write offline.access",
      state,
      code_challenge: state,
      code_challenge_method: "plain",
    });
    authUrl = `https://twitter.com/i/oauth2/authorize?${params}`;
  } else if (platform === "meta") {
    const clientId = process.env.META_APP_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: "email,public_profile,pages_manage_posts,pages_read_engagement,pages_show_list",
    });
    authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  } else {
    return res.status(400).json({ error: "Unknown OAuth platform" });
  }

  res.json({ url: authUrl, state });
});

// OAuth callback
router.get("/oauth/:platform/callback", async (req, res) => {
  const { platform } = req.params;
  const { code, error, state } = req.query;

  if (error) {
    return res.redirect(`/?oauth_error=${encodeURIComponent(error as string)}&platform=${platform}`);
  }

  if (!code) {
    return res.redirect(`/?oauth_error=no_code&platform=${platform}`);
  }

  const appBaseUrl = process.env.APP_BASE_URL;
  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const reqHost = req.get("x-forwarded-host") || req.get("host");
  const reqProto = req.get("x-forwarded-proto") || "https";
  const baseUrl = appBaseUrl
    || (reqHost ? `${reqProto}://${reqHost}` : null)
    || (replitDomain ? `https://${replitDomain}` : null)
    || "http://localhost";
  const redirectUri = `${baseUrl}/api/connections/oauth/${platform}/callback`;

  try {
    // Extract workspace encoded in state as "workspace|randomString"
    const stateStr = (state as string) || "";
    const workspaceSlug = stateStr.includes("|") ? stateStr.split("|")[0] : "general";

    let accessToken = "";
    let refreshToken = "";
    let accountLabel = "";
    let expiresAt: Date | undefined;

    if (platform === "google") {
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenResp.json() as Record<string, unknown>;
      accessToken = tokenData.access_token as string || "";
      refreshToken = tokenData.refresh_token as string || "";
      if (tokenData.expires_in) expiresAt = new Date(Date.now() + Number(tokenData.expires_in) * 1000);

      // Get user info
      const userResp = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userResp.json() as Record<string, unknown>;
      accountLabel = userInfo.email as string || "";
    } else if (platform === "linkedin") {
      const tokenResp = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          client_id: process.env.LINKEDIN_CLIENT_ID || "",
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
          redirect_uri: redirectUri,
        }),
      });
      const tokenData = await tokenResp.json() as Record<string, unknown>;
      accessToken = tokenData.access_token as string || "";
      if (tokenData.expires_in) expiresAt = new Date(Date.now() + Number(tokenData.expires_in) * 1000);

      // Get profile info
      const profileResp = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileResp.ok) {
        const profile = await profileResp.json() as Record<string, unknown>;
        const firstName = profile.localizedFirstName as string || "";
        const lastName = profile.localizedLastName as string || "";
        accountLabel = `${firstName} ${lastName}`.trim();
      }
    } else if (platform === "twitter") {
      const tokenResp = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
          code_verifier: state as string,
        }),
      });
      const tokenData = await tokenResp.json() as Record<string, unknown>;
      accessToken = tokenData.access_token as string || "";
      refreshToken = tokenData.refresh_token as string || "";

      const userResp = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userResp.ok) {
        const userData = await userResp.json() as Record<string, { name: string; username: string }>;
        accountLabel = `@${userData.data?.username || ""}`;
      }
    } else if (platform === "meta") {
      const tokenResp = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${redirectUri}&client_secret=${process.env.META_APP_SECRET}&code=${code}`);
      const tokenData = await tokenResp.json() as Record<string, unknown>;
      accessToken = tokenData.access_token as string || "";

      // Get account info
      const userResp = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=name,email`);
      if (userResp.ok) {
        const userData = await userResp.json() as Record<string, unknown>;
        accountLabel = userData.name as string || userData.email as string || "";
      }
    }

    // Upsert connection — scoped to the workspace extracted from state
    const existing = await db.select().from(connectionsTable)
      .where(and(eq(connectionsTable.platform, platform), eq(connectionsTable.workspaceSlug, workspaceSlug)));
    if (existing.length > 0) {
      await db.update(connectionsTable).set({
        accessToken,
        refreshToken: refreshToken || undefined,
        accountLabel,
        isConnected: true,
        expiresAt,
        workspaceSlug,
      }).where(eq(connectionsTable.id, existing[0].id));
    } else {
      await db.insert(connectionsTable).values({
        workspaceSlug,
        platform,
        displayName: PLATFORM_DISPLAY_NAMES[platform] || platform,
        authType: "oauth",
        accessToken,
        refreshToken: refreshToken || undefined,
        accountLabel,
        scopes: [],
        isConnected: true,
        expiresAt,
      });
    }

    res.redirect(`/?oauth_success=true&platform=${platform}`);
  } catch (err) {
    logger.error(err, "OAuth callback error");
    res.redirect(`/?oauth_error=callback_failed&platform=${platform}`);
  }
});

// Post content via a platform
router.post("/:id/actions/post", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content } = req.body;
    const [conn] = await db.select().from(connectionsTable).where(eq(connectionsTable.id, id));
    if (!conn) return res.status(404).json({ error: "Connection not found" });
    if (!conn.accessToken && !conn.apiKey) return res.status(400).json({ error: "No credentials available" });

    if (conn.platform === "linkedin") {
      // Get LinkedIn person URN first
      const meResp = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${conn.accessToken}` },
      });
      const me = await meResp.json() as { id: string };
      
      const postResp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${me.id}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      if (postResp.ok) {
        const data = await postResp.json() as { id: string };
        res.json({ success: true, message: "Posted to LinkedIn", postId: data.id });
      } else {
        const err = await postResp.json() as Record<string, unknown>;
        res.json({ success: false, message: `LinkedIn error: ${JSON.stringify(err)}` });
      }
    } else if (conn.platform === "twitter") {
      const tweetResp = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
      });
      if (tweetResp.ok) {
        const data = await tweetResp.json() as { data: { id: string } };
        res.json({ success: true, message: "Posted to Twitter/X", postId: data.data?.id });
      } else {
        res.json({ success: false, message: "Failed to post tweet" });
      }
    } else if (conn.platform === "meta") {
      // Post to Facebook page feed
      const pagesResp = await fetch(`https://graph.facebook.com/me/accounts?access_token=${conn.accessToken}`);
      const pages = await pagesResp.json() as { data: Array<{ id: string; access_token: string }> };
      if (!pages.data?.length) return res.json({ success: false, message: "No Facebook pages found" });
      
      const page = pages.data[0];
      const postResp = await fetch(`https://graph.facebook.com/${page.id}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, access_token: page.access_token }),
      });
      if (postResp.ok) {
        const data = await postResp.json() as { id: string };
        res.json({ success: true, message: "Posted to Facebook", postId: data.id });
      } else {
        res.json({ success: false, message: "Failed to post to Facebook" });
      }
    } else {
      res.json({ success: false, message: `Posting not supported for ${conn.platform}` });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to post" });
  }
});

// Send message/DM
router.post("/:id/actions/send-message", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { recipientId, message } = req.body;
    const [conn] = await db.select().from(connectionsTable).where(eq(connectionsTable.id, id));
    if (!conn) return res.status(404).json({ error: "Connection not found" });

    if (conn.platform === "google" && conn.accessToken) {
      // Send Gmail
      const emailContent = [
        `To: ${recipientId}`,
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        message,
      ].join("\n");
      const encoded = Buffer.from(emailContent).toString("base64url");
      const sendResp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      });
      if (sendResp.ok) {
        res.json({ success: true, message: "Email sent via Gmail" });
      } else {
        res.json({ success: false, message: "Failed to send email" });
      }
    } else if (conn.platform === "linkedin" && conn.accessToken) {
      // LinkedIn messaging (requires conversation URN)
      res.json({ success: false, message: "LinkedIn DMs require a conversation thread. Use LinkedIn's messaging interface to start a new conversation." });
    } else if (conn.platform === "twitter" && conn.accessToken) {
      const dmResp = await fetch("https://api.twitter.com/2/dm_conversations/with/:participant_id/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      });
      if (dmResp.ok) {
        res.json({ success: true, message: "DM sent via Twitter/X" });
      } else {
        res.json({ success: false, message: "Failed to send Twitter DM" });
      }
    } else if (conn.platform === "gohighlevel" && conn.apiKey) {
      const sendResp = await fetch("https://rest.gohighlevel.com/v1/conversations/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contactId: recipientId, type: "SMS", message }),
      });
      if (sendResp.ok) {
        res.json({ success: true, message: "Message sent via GoHighLevel" });
      } else {
        res.json({ success: false, message: "Failed to send via GoHighLevel" });
      }
    } else if (conn.platform === "smtp" && conn.apiKey) {
      const m = conn.metadata as Record<string, string> | null ?? {};
      try {
        const transporter = nodemailer.createTransport({
          host: m.host,
          port: parseInt(m.port || "587"),
          secure: parseInt(m.port || "587") === 465,
          auth: { user: m.username, pass: conn.apiKey },
        });
        const subject = req.body.subject || "Message from SynthDesk AI";
        await transporter.sendMail({
          from: m.fromName ? `"${m.fromName}" <${m.fromAddress}>` : m.fromAddress,
          to: recipientId,
          subject,
          text: message,
          html: message.replace(/\n/g, "<br>"),
        });
        res.json({ success: true, message: `Email sent from ${m.fromAddress} to ${recipientId}` });
      } catch (e: any) {
        res.json({ success: false, message: `Email failed: ${e.message}` });
      }
    } else if (conn.platform === "twilio" && conn.apiKey) {
      const m = conn.metadata as Record<string, string> | null ?? {};
      const accountSid = m.accountSid || "";
      const from = m.phoneNumber || "";
      const body = new URLSearchParams({ From: from, To: recipientId, Body: message });
      const sendResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${conn.apiKey}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      if (sendResp.ok) {
        const data = await sendResp.json() as { sid: string };
        res.json({ success: true, message: `SMS sent from ${from} to ${recipientId}`, sid: data.sid });
      } else {
        const err = await sendResp.json() as Record<string, unknown>;
        res.json({ success: false, message: `Twilio error: ${err.message || JSON.stringify(err)}` });
      }
    } else if (conn.platform === "commhub" && conn.apiKey) {
      const channel = req.body.channel || "sms";
      const sendResp = await fetch(`${COMMHUB_BASE}/api/v1/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: recipientId, body: message, channel }),
      });
      if (sendResp.ok) {
        const data = await sendResp.json() as Record<string, unknown>;
        res.json({ success: true, message: `${channel.toUpperCase()} sent via CommHub`, messageId: data.message_id });
      } else {
        const err = await sendResp.json() as Record<string, unknown>;
        res.json({ success: false, message: `CommHub error: ${(err as any).detail || JSON.stringify(err)}` });
      }
    } else if (conn.platform === "mailbase" && conn.apiKey) {
      const m = conn.metadata as Record<string, string> | null ?? {};
      const subject = req.body.subject || "Message from SynthDesk AI";
      const htmlContent = message.replace(/\n/g, "<br>");
      const sendResp = await fetch(`${MAILBASE_BASE}/api/transactional/send`, {
        method: "POST",
        headers: {
          "x-api-key": conn.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toEmail: recipientId,
          fromEmail: m.fromEmail || m.fromAddress,
          fromName: m.fromName,
          subject,
          htmlContent,
          tenantId: m.tenantId,
        }),
      });
      if (sendResp.ok) {
        res.json({ success: true, message: `Email sent via MailBase from ${m.fromEmail || m.fromAddress} to ${recipientId}` });
      } else {
        const err = await sendResp.json() as Record<string, unknown>;
        res.json({ success: false, message: `MailBase error: ${(err as any).message || JSON.stringify(err)}` });
      }
    } else {
      res.json({ success: false, message: `Messaging not supported for ${conn.platform}` });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
