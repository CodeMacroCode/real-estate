'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LogOut,
  ChevronRight,
  Home,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Laptop,
  Smartphone,
  Tablet,
  ShieldAlert,
  Monitor,
  Check,
} from 'lucide-react';
import { SafeUser, IUserSession } from '@/types';
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
  const [logoutScope, setLogoutScope] = useState<'current' | 'all'>('current');
  const [sessions, setSessions] = useState<IUserSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isExitingImpersonation, setIsExitingImpersonation] = useState(false);
  const [dynamicBreadcrumbLabels, setDynamicBreadcrumbLabels] = useState<Record<string, string>>({});

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data?.sessions || data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load active device sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleOpenLogout = () => {
    setIsSuccess(false);
    setIsLoggingOut(false);
    setLogoutScope('current');
    setIsDialogOpen(true);
    fetchSessions();
  };

  // Listen to breadcrumb updates from child pages or fetch client name when on client-information/[id]
  useEffect(() => {
    const handleUpdate = (e: CustomEvent) => {
      if (e.detail?.segment && e.detail?.label) {
        setDynamicBreadcrumbLabels((prev) => ({
          ...prev,
          [e.detail.segment]: e.detail.label,
        }));
      }
    };

    window.addEventListener('updateBreadcrumbLabel' as any, handleUpdate);

    // Auto-resolve MongoDB ObjectId when on client-information/[id] or projects/[id]
    const segments = pathname.split('/').filter(Boolean);
    const lastSeg = segments[segments.length - 1];
    if (
      segments.includes('client-information') &&
      lastSeg &&
      /^[0-9a-fA-F]{24}$/.test(lastSeg) &&
      !dynamicBreadcrumbLabels[lastSeg]
    ) {
      fetch(`/api/clients/${lastSeg}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.clientName) {
            setDynamicBreadcrumbLabels((prev) => ({
              ...prev,
              [lastSeg]: json.data.clientName,
            }));
          }
        })
        .catch(() => {});
    }

    if (
      segments.includes('projects') &&
      lastSeg &&
      lastSeg !== 'projects' &&
      !dynamicBreadcrumbLabels[lastSeg]
    ) {
      fetch(`/api/projects/${lastSeg}`)
        .then((res) => res.json())
        .then((json) => {
          const projectName = json.data?.name || json.data?.project?.name;
          if (json.success && projectName) {
            setDynamicBreadcrumbLabels((prev) => ({
              ...prev,
              [lastSeg]: projectName,
            }));
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('updateBreadcrumbLabel' as any, handleUpdate);
    };
  }, [pathname, dynamicBreadcrumbLabels]);

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

  const handleLogout = async (scopeToUse?: 'current' | 'all') => {
    const targetScope = scopeToUse || logoutScope;
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: targetScope }),
      });
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
    if (dynamicBreadcrumbLabels[seg]) {
      return dynamicBreadcrumbLabels[seg];
    }
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/75 backdrop-blur-md shadow-xs transition-all duration-200 supports-[backdrop-filter]:bg-white/60">
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
                  onClick={handleOpenLogout}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 hover:text-slate-950 hover:border-slate-400 transition shadow-2xs"
                  title="Sign out of system"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-700" />
                  <span className="font-semibold text-slate-800">Logout</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-xl max-w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-6">
                <AlertDialogHeader>
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isSuccess
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : logoutScope === 'all'
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5 animate-in zoom-in" />
                      ) : logoutScope === 'all' ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : (
                        <LogOut className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <AlertDialogTitle className="text-base font-bold text-slate-900">
                        {isSuccess ? 'Signed Out Successfully' : 'Sign Out & Session Controls'}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {isSuccess
                          ? 'Your session has been securely ended. Redirecting to login...'
                          : 'Choose whether you want to log out from this device only or terminate all active sessions across all devices.'}
                      </AlertDialogDescription>
                    </div>
                  </div>
                </AlertDialogHeader>

                {!isSuccess && (
                  <div className="space-y-4 pt-1">
                    {/* Scope Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setLogoutScope('current')}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                          logoutScope === 'current'
                            ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Laptop className={`w-4 h-4 ${logoutScope === 'current' ? 'text-blue-600' : 'text-slate-500'}`} />
                            <span className={`text-xs font-bold ${logoutScope === 'current' ? 'text-blue-950' : 'text-slate-800'}`}>
                              This Device Only
                            </span>
                          </div>
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              logoutScope === 'current'
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {logoutScope === 'current' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-2 leading-relaxed ${logoutScope === 'current' ? 'text-blue-700' : 'text-slate-500'}`}>
                          Only terminates your session in this browser. You stay logged in on other phones and computers.
                        </p>
                      </div>

                      <div
                        onClick={() => setLogoutScope('all')}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                          logoutScope === 'all'
                            ? 'border-rose-600 bg-rose-50/70 ring-1 ring-rose-600 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className={`w-4 h-4 ${logoutScope === 'all' ? 'text-rose-600' : 'text-slate-500'}`} />
                            <span className={`text-xs font-bold ${logoutScope === 'all' ? 'text-rose-950' : 'text-slate-800'}`}>
                              All Logged-in Devices
                            </span>
                          </div>
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              logoutScope === 'all'
                                ? 'border-rose-600 bg-rose-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {logoutScope === 'all' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-2 leading-relaxed ${logoutScope === 'all' ? 'text-rose-700' : 'text-slate-500'}`}>
                          Immediately signs out all active sessions across phones, tablets, and computers.
                        </p>
                      </div>
                    </div>

                    {/* Active Devices List */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <Monitor className="w-3.5 h-3.5 text-slate-600" />
                          <span>Logged-in Devices</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                          {isLoadingSessions
                            ? 'Checking...'
                            : `${sessions.length} active ${sessions.length === 1 ? 'device' : 'devices'}`}
                        </span>
                      </div>

                      {isLoadingSessions ? (
                        <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Detecting active device sessions...</span>
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="text-center py-3 text-xs text-slate-500">
                          Current device session active
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {sessions.map((s, idx) => {
                            const isCurrent = s.isCurrentDevice;
                            return (
                              <div
                                key={s.sessionId || idx}
                                className={`flex items-center justify-between rounded-lg p-2.5 text-xs transition border bg-white ${
                                  isCurrent
                                    ? 'border-emerald-200 shadow-2xs ring-1 ring-emerald-500/20'
                                    : 'border-slate-200/80'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                                    {s.deviceType === 'mobile' ? (
                                      <Smartphone className="w-4 h-4 text-blue-600" />
                                    ) : s.deviceType === 'tablet' ? (
                                      <Tablet className="w-4 h-4 text-purple-600" />
                                    ) : (
                                      <Laptop className="w-4 h-4 text-indigo-600" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-900 truncate">
                                        {s.deviceName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                      <span>IP: {s.ipAddress || '127.0.0.1'}</span>
                                      <span>•</span>
                                      <span>{isCurrent ? 'Active now' : 'Signed in'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  {isCurrent ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      This Device
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                      Other Device
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <AlertDialogFooter className="pt-2">
                  {!isSuccess && (
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={() => setIsDialogOpen(false)}
                      className="mt-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 sm:mt-0 transition disabled:opacity-50 shadow-2xs"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleLogout()}
                    disabled={isLoggingOut || isSuccess}
                    className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                      isSuccess
                        ? 'bg-emerald-600'
                        : logoutScope === 'all'
                        ? 'bg-rose-600 hover:bg-rose-700 disabled:opacity-75'
                        : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-75'
                    }`}
                  >
                    {isLoggingOut && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-white" />}
                    <span>
                      {isSuccess
                        ? 'Signed Out!'
                        : isLoggingOut
                        ? 'Signing out...'
                        : logoutScope === 'all'
                        ? 'Sign Out of All Devices'
                        : 'Sign Out of This Device'}
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
