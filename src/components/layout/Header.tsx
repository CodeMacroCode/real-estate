'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, Shield, Database } from 'lucide-react';
import { SafeUser } from '@/types';
import { RoleBadge } from '../ui/Badge';

interface HeaderProps {
  user?: SafeUser | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
          <Database className="w-3.5 h-3.5" />
          <span>MongoDB Connected</span>
        </span>
        <span className="text-xs text-slate-400">|</span>
        <span className="text-xs font-medium text-slate-500">
          Phase 1 Foundation
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user.name}</span>
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs text-slate-500">{user.department} &bull; {user.branch}</span>
                <RoleBadge roleSlug={user.role?.slug} roleName={user.role?.name} />
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
              title="Sign out of system"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:underline"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
