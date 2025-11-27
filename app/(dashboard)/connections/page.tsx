import { auth } from '@/app/(auth)/auth';
import { ConnectionList } from '@/components/institutions/connection-list';
import { ManualAssetForm } from '@/components/institutions/manual-asset-form';
import { NotificationsPanel } from '@/components/institutions/notifications-panel';
import {
  getConnectionDashboardSummary,
  getManualAssetsByUserId,
  getNotificationsByUserId,
} from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export default async function ConnectionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const [connections, manualAssets, notifications] = await Promise.all([
    getConnectionDashboardSummary({ userId: session.user.id }),
    getManualAssetsByUserId({ userId: session.user.id }),
    getNotificationsByUserId({ userId: session.user.id }),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className="text-sm text-muted-foreground">
          Track linked institutions, manage manual holdings, and monitor sync notifications.
        </p>
      </div>

      <ConnectionList initialConnections={connections} />

      <ManualAssetForm initialAssets={manualAssets} />

      <NotificationsPanel initialNotifications={notifications} />
    </div>
  );
}
