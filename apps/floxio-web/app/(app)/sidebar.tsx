'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, cn } from '@org/ui-kit';
import { signOut } from '../../lib/auth-client';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/clients', label: 'Clients' },
  { href: '/projects', label: 'Projects' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/integrations', label: 'Integrations' },
];

export function Sidebar({ userName, orgId }: { userName: string; orgId: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white p-4">
      <div className="mb-6 px-2">
        <h1 className="text-lg font-semibold">Floxio</h1>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {userName} {orgId ? '·' : ''} {orgId ? orgId.slice(0, 6) : 'no workspace'}
        </p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <Button variant="secondary" className="w-full" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </aside>
  );
}
