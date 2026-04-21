import { redirect } from 'next/navigation';
import { getServerSession } from '../../lib/api';
import { Sidebar } from './sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/sign-in');

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.user.name} orgId={session.session.activeOrganizationId} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
