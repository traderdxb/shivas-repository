import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { auth } from '../(auth)/auth';

export const experimental_ppr = true;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={session?.user} />
      <SidebarInset className="bg-muted/40 min-h-screen">
        <div className="flex flex-col w-full flex-1 px-4 py-6 md:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
