import nodemailer from "nodemailer";
import { logger } from "./logger";

const OWNER_EMAIL = "simaoalves1@gmail.com";

function getTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    logger.warn("Email not configured — set EMAIL_HOST, EMAIL_USER, EMAIL_PASS env vars");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_PORT === "465",
    auth: { user, pass },
  });
}

export interface EmailOptions {
  to?: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.info({ subject: options.subject }, "Email skipped (not configured)");
    return false;
  }

  try {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || OWNER_EMAIL;
    await transporter.sendMail({
      from,
      to: options.to || OWNER_EMAIL,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info({ subject: options.subject, to: options.to || OWNER_EMAIL }, "Email sent");
    return true;
  } catch (err) {
    logger.error(err, "Failed to send email");
    return false;
  }
}

export async function sendAutomationCompletedEmail(opts: {
  automationName: string;
  agentName: string;
  output: string;
  businessTag: string;
}): Promise<void> {
  const preview = opts.output.slice(0, 500) + (opts.output.length > 500 ? "…" : "");
  await sendEmail({
    subject: `✅ Automation complete: ${opts.automationName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f14; color: #e5e7eb; border-radius: 12px;">
        <h2 style="color: #a78bfa; margin-top: 0;">🤖 Automation Complete</h2>
        <p style="color: #9ca3af;"><strong style="color: #e5e7eb;">${opts.automationName}</strong> ran by <strong style="color: #e5e7eb;">${opts.agentName}</strong> — workspace: ${opts.businessTag}</p>
        <div style="background: #1a1a2e; border: 1px solid #374151; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #d1d5db;">${preview}</p>
        </div>
        <p style="font-size: 12px; color: #6b7280;">Log in to SynthDesk to review and approve this output.</p>
      </div>
    `,
    text: `Automation "${opts.automationName}" completed by ${opts.agentName}.\n\nOutput:\n${opts.output}`,
  });
}

export async function sendPostPublishedEmail(opts: {
  platform: string;
  content: string;
  publishedUrl?: string;
  platformPostId?: string;
}): Promise<void> {
  const platformLabel = opts.platform.charAt(0).toUpperCase() + opts.platform.slice(1);
  await sendEmail({
    subject: `📱 Post published on ${platformLabel}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f14; color: #e5e7eb; border-radius: 12px;">
        <h2 style="color: #34d399; margin-top: 0;">📱 Post Published</h2>
        <p style="color: #9ca3af;">Your post was published to <strong style="color: #e5e7eb;">${platformLabel}</strong></p>
        <div style="background: #1a1a2e; border: 1px solid #374151; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #d1d5db;">${opts.content.slice(0, 300)}</p>
        </div>
        ${opts.publishedUrl ? `<a href="${opts.publishedUrl}" style="color: #818cf8;">View post →</a>` : ""}
        ${opts.platformPostId ? `<p style="font-size: 12px; color: #6b7280;">Post ID: ${opts.platformPostId}</p>` : ""}
      </div>
    `,
    text: `Post published on ${platformLabel}.\n\n${opts.content}`,
  });
}

export async function sendWeeklyDigestEmail(opts: {
  kpis: Array<{ workspace: string; name: string; value: number; unit: string }>;
  tasksCompleted: number;
  postsPublished: number;
  automationsRan: number;
}): Promise<void> {
  const kpiRows = opts.kpis
    .map(k => `<tr><td style="padding: 4px 8px; color: #9ca3af;">${k.workspace}</td><td style="padding: 4px 8px; color: #e5e7eb;">${k.name}</td><td style="padding: 4px 8px; color: #a78bfa; font-weight: bold;">${k.unit === '$' ? '$' : ''}${k.value}${k.unit !== '$' ? k.unit : ''}</td></tr>`)
    .join('');

  await sendEmail({
    subject: `📊 SynthDesk Weekly Digest`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f14; color: #e5e7eb; border-radius: 12px;">
        <h2 style="color: #a78bfa; margin-top: 0;">📊 Weekly Business Digest</h2>
        <div style="display: flex; gap: 12px; margin: 16px 0;">
          <div style="flex: 1; background: #1a1a2e; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #34d399;">${opts.tasksCompleted}</div>
            <div style="font-size: 12px; color: #6b7280;">Tasks Done</div>
          </div>
          <div style="flex: 1; background: #1a1a2e; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #818cf8;">${opts.postsPublished}</div>
            <div style="font-size: 12px; color: #6b7280;">Posts Published</div>
          </div>
          <div style="flex: 1; background: #1a1a2e; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${opts.automationsRan}</div>
            <div style="font-size: 12px; color: #6b7280;">Automations</div>
          </div>
        </div>
        ${kpiRows ? `
        <h3 style="color: #a78bfa;">KPI Snapshot</h3>
        <table style="width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 8px; overflow: hidden;">
          <thead><tr style="background: #111827;">
            <th style="padding: 8px; text-align: left; color: #6b7280; font-size: 12px;">Workspace</th>
            <th style="padding: 8px; text-align: left; color: #6b7280; font-size: 12px;">KPI</th>
            <th style="padding: 8px; text-align: left; color: #6b7280; font-size: 12px;">Value</th>
          </tr></thead>
          <tbody>${kpiRows}</tbody>
        </table>
        ` : ""}
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">Powered by SynthDesk AI Hub</p>
      </div>
    `,
    text: `Weekly Digest: ${opts.tasksCompleted} tasks, ${opts.postsPublished} posts, ${opts.automationsRan} automations ran.`,
  });
}
