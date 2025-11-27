import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports & Exports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Generate audit-ready PDF packs and CSV extracts directly from the dashboard. Custom waterfall, investor letters, and
            compliance bundles follow the same filters you set on the main view.
          </p>
          <p>
            Scheduled delivery, watermarks, and digital signatures are rolling out next. Let us know which workflows you need to
            automate and we&apos;ll configure them for your workspace.
          </p>
          <Button size="sm" className="mt-2 w-fit">
            Contact WealthMatters
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
