import React from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthContext } from '@/lib/auth/session';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  const authContext = await getServerAuthContext();
  if (authContext) {
    redirect('/dashboard');
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  return <LoginForm reason={resolvedParams?.reason} />;
}
