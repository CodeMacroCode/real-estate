import React from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { getServerAuthContext } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect('/login?reason=deactivated');
  }

  const cleanUser = JSON.parse(JSON.stringify(authContext.user));
  const cleanRole = JSON.parse(JSON.stringify(authContext.role));

  return (
    <AuthProvider user={cleanUser} role={cleanRole}>
      <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
        <Sidebar user={cleanUser} />
        <div className="flex flex-1 flex-col pl-64 min-w-0">
          <Header user={cleanUser} />
          <main className="flex-1 p-6 md:p-8 w-full min-w-0">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
