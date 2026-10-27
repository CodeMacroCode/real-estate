import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: 'active' | 'inactive' | string }) {
  if (status === 'active') {
    return <Badge variant="success">Active</Badge>;
  }
  return <Badge variant="danger">Inactive</Badge>;
}

export function LoginStatusBadge({ status }: { status: 'online' | 'offline' | 'never_logged_in' | string }) {
  if (status === 'online') {
    return (
      <span className="inline-flex items-center text-xs text-emerald-700 font-medium">
        <span className="w-1.5 h-1.5 mr-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
        Online
      </span>
    );
  }
  if (status === 'offline') {
    return (
      <span className="inline-flex items-center text-xs text-slate-500">
        <span className="w-1.5 h-1.5 mr-1.5 bg-slate-400 rounded-full"></span>
        Offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs text-amber-600">
      <span className="w-1.5 h-1.5 mr-1.5 bg-amber-400 rounded-full"></span>
      Never Logged In
    </span>
  );
}

export function RoleBadge({ roleSlug, roleName }: { roleSlug?: string; roleName?: string }) {
  const name = roleName || roleSlug || 'Staff';
  if (roleSlug === 'super_admin') {
    return <Badge variant="purple">{name}</Badge>;
  }
  if (roleSlug === 'admin') {
    return <Badge variant="info">{name}</Badge>;
  }
  if (roleSlug?.includes('sales')) {
    return <Badge variant="warning">{name}</Badge>;
  }
  return <Badge variant="default">{name}</Badge>;
}
