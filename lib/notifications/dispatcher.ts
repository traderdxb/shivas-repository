import { Resend } from 'resend';

import type { InstitutionConnection } from '@/lib/db/schema';
import { createNotificationRecord } from '@/lib/db/queries';

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const defaultFromEmail = process.env.RESEND_FROM_EMAIL ?? 'notifications@deepresearch.local';

interface SyncNotificationContext {
  userId: string;
  email?: string | null;
  connection: InstitutionConnection;
  stats?: {
    accounts?: number;
    holdings?: number;
    transactions?: number;
  };
  error?: string;
}

export class NotificationDispatcher {
  async sendEmail(to: string, subject: string, html: string) {
    if (!resendClient) return;
    if (!to) return;

    try {
      await resendClient.emails.send({
        from: defaultFromEmail,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send Resend email', error);
    }
  }

  async sendInAppNotification({
    userId,
    type,
    title,
    body,
    metadata,
  }: {
    userId: string;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }) {
    return await createNotificationRecord({
      userId,
      type,
      title,
      body,
      metadata,
    });
  }

  async notifySyncSuccess(context: SyncNotificationContext) {
    const title = `Synced ${context.connection.institutionName ?? 'institution'}`;
    const summaryParts = [];
    if (context.stats?.accounts)
      summaryParts.push(`${context.stats.accounts} accounts`);
    if (context.stats?.holdings)
      summaryParts.push(`${context.stats.holdings} holdings`);
    if (context.stats?.transactions)
      summaryParts.push(`${context.stats.transactions} transactions`);

    const summary = summaryParts.length
      ? `Updated ${summaryParts.join(', ')}.`
      : 'Your data is now up to date.';

    await this.sendInAppNotification({
      userId: context.userId,
      type: 'sync.success',
      title,
      body: summary,
      metadata: {
        connectionId: context.connection.id,
        stats: context.stats,
      },
    });

    if (context.email) {
      await this.sendEmail(
        context.email,
        title,
        `<p>${summary}</p><p>Next sync will run automatically tomorrow.</p>`,
      );
    }
  }

  async notifySyncFailure(context: SyncNotificationContext) {
    const title = `Sync failed for ${context.connection.institutionName ?? 'institution'}`;
    const description = context.error ?? 'An unexpected error occurred while syncing accounts.';

    await this.sendInAppNotification({
      userId: context.userId,
      type: 'sync.failure',
      title,
      body: description,
      metadata: {
        connectionId: context.connection.id,
        error: context.error,
      },
    });

    if (context.email) {
      await this.sendEmail(
        context.email,
        title,
        `<p>${description}</p><p>Reconnect your institution to resume syncing.</p>`,
      );
    }
  }

  async notifyThreshold({
    userId,
    email,
    title,
    body,
    metadata,
  }: {
    userId: string;
    email?: string | null;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.sendInAppNotification({
      userId,
      type: 'threshold',
      title,
      body,
      metadata,
    });

    if (email) {
      await this.sendEmail(email, title, `<p>${body}</p>`);
    }
  }
}
