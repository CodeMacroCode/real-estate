import React from 'react';
import { redirect } from 'next/navigation';
import { getServerAuthContext } from '@/lib/auth/session';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const authContext = await getServerAuthContext();
  if (authContext) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}
