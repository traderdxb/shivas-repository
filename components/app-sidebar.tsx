'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from 'next-auth';

import {
  LayoutDashboard,
  Link2,
  FileText,
  ShieldCheck,
} from 'lucide-react';

import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const NAV_ITEMS = [
  {
    title: 'Dashboard',
    description: 'Real-time allocation pulse',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Connections',
    description: 'Custodians, banks, and feeds',
    href: '/connections',
    icon: Link2,
  },
  {
    title: 'Reports',
    description: 'Exports & regulatory packs',
    href: '/reports',
    icon: FileText,
  },
];

export function AppSidebar({ user }: { user: User | undefined }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/"
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-sidebar-accent/20 px-3 py-2"
              onClick={() => setOpenMobile(false)}
            >
              <Image
                src="/wealthmatters-mark.svg"
                alt="WealthMatters"
                width={32}
                height={32}
              />
              <div>
                <p className="text-base font-semibold leading-tight">WealthMatters</p>
                <p className="text-xs text-muted-foreground">Portfolio Intelligence</p>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} className="flex flex-col gap-1 rounded-2xl px-3 py-3">
                  <Link
                    href={item.href}
                    className="w-full"
                    onClick={() => setOpenMobile(false)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        <div className="mt-6 space-y-3 rounded-3xl border border-muted bg-sidebar-accent/10 p-4 text-sm">
          <div className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Compliance ready
          </div>
          <p className="text-muted-foreground">
            Export audit-ready packs and share snapshot links with LPs or regulators in a single click.
          </p>
          <Button asChild variant="secondary" size="sm" className="w-full">
            <Link href="/reports" onClick={() => setOpenMobile(false)}>
              Book a review
            </Link>
          </Button>
        </div>
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <SidebarUserNav user={user} />
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href="/login" onClick={() => setOpenMobile(false)}>
              Sign in
            </Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
