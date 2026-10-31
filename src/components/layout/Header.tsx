'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, ChevronRight, Home, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { SafeUser } from '@/types';
import { RoleBadge } from '../ui/Badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HeaderProps {
  user?: SafeUser | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExitingImpersonation, setIsExitingImpersonation] = useState(false);

  const handleExitImpersonation = async () => {
    setIsExitingImpersonation(true);
    try {
      const res = await fetch('/api/auth/impersonate/exit', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/users';
      }
    } catch (err) {
      console.error('Failed to exit impersonation', err);
    } finally {
      setIsExitingImpersonation(false);
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsSuccess(true);
      setTimeout(() => {
        setIsDialogOpen(false);
        router.push('/login');
        router.refresh();
      }, 700);
    } catch (err) {
      console.error('Logout error:', err);
      setIsDialogOpen(false);
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Generate dynamic breadcrumb segments from current pathname
  const segments = pathname.split('/').filter(Boolean);

  const getSegmentLabel = (seg: string) => {
    switch (seg) {
      case 'dashboard':
        return 'Dashboard';
      case 'users':
        return 'Admin Management';
      case 'staff':
        return 'Staff Management';
      case 'roles':
        return 'Roles & Permissions';
      case 'audit-logs':
        return 'Audit Logs';
      default:
        return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      {user?.isImpersonating && (
        <div className="bg-amber-400 border-b border-amber-500 text-slate-950 px-6 py-2 flex items-center justify-between text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
            <span>
              Impersonation Active: Viewing system as <strong>{user.name}</strong> ({user.role?.name || 'Admin'}). Original Session: Super Admin ({user.impersonator?.name || user.impersonator?.email}).
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            disabled={isExitingImpersonation}
            className="flex items-center gap-1.5 rounded-md bg-slate-950 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
          >
            {isExitingImpersonation && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isExitingImpersonation ? 'Exiting Session...' : 'Exit & Return to Super Admin'}</span>
          </button>
        </div>
      )}
      <div className="flex h-16 w-full items-center justify-between px-6">
        {/* Dynamic Breadcrumbs Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 font-medium text-slate-500 hover:text-blue-600 transition"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>

        {segments.map((seg, idx) => {
          const href = '/' + segments.slice(0, idx + 1).join('/');
          const isLast = idx === segments.length - 1;
          const label = getSegmentLabel(seg);

          return (
            <React.Fragment key={href}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              {isLast ? (
                <span className="font-semibold text-slate-800">{label}</span>
              ) : (
                <Link
                  href={href}
                  className="font-medium text-slate-500 hover:text-blue-600 transition"
                >
                  {label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user.name}</span>
              <div className="flex items-center justify-end gap-1.5">
                <RoleBadge roleSlug={user.role?.slug} roleName={user.role?.name} />
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* Confirmation Dialog for Logout */}
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setIsLoggingOut(false);
                    setIsDialogOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                  title="Sign out of system"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                        isSuccess
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5 animate-in zoom-in" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <AlertDialogTitle>
                        {isSuccess ? 'Signed Out Successfully' : 'Confirm Sign Out'}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="mt-1">
                        {isSuccess
                          ? 'Your session has been securely ended. Redirecting to login...'
                          : 'Are you sure you want to log out of your session? You will need to sign in again to access the CRM.'}
                      </AlertDialogDescription>
                    </div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  {!isSuccess && (
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={() => setIsDialogOpen(false)}
                      className="mt-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:mt-0 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut || isSuccess}
                    className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                      isSuccess
                        ? 'bg-emerald-600'
                        : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-75'
                    }`}
                  >
                    {isLoggingOut && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-white" />}
                    <span>
                      {isSuccess
                        ? 'Signed Out!'
                        : isLoggingOut
                        ? 'Signing out...'
                        : 'Yes, Sign Out'}
                    </span>
                  </button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
    </div>
  </header>
);
}
