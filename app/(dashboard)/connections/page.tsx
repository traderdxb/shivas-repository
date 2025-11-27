import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConnectionsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            WealthMatters connections manage secure custodial, banking, and alternative fund feeds. API keys, SFTP endpoints,
            and on-prem agents sync positions into the dashboard every few minutes.
          </p>
          <p>
            This area is being refreshed to match the new analytics experience. In the meantime, reach out to your WealthMatters
            partner lead to add or rotate a connection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
