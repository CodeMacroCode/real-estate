import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'secondary' | 'outline' | 'destructive';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    secondary: 'bg-slate-100 text-slate-600 border-slate-200',
    outline: 'text-slate-500 border-slate-200 bg-transparent',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200',
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
      className={`inline-flex items-center rounded-full border font-medium ${variantStyles[variant] || variantStyles.default} ${sizeStyles[size]} ${className}`}
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
      <span className="inline-flex items-center text-xs text-slate-500 font-medium">
        <span className="w-1.5 h-1.5 mr-1.5 bg-slate-400 rounded-full"></span>
        Offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs text-slate-400 font-medium">
      Never
    </span>
  );
}

export function RoleBadge({ roleSlug, roleName }: { roleSlug?: string; roleName?: string }) {
  const getBadgeVariant = (slug?: string) => {
    switch (slug) {
      case 'super_admin':
        return 'danger';
      case 'admin':
        return 'purple';
      case 'manager':
        return 'info';
      case 'agent':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Badge variant={getBadgeVariant(roleSlug)}>
      {roleName || roleSlug || 'Unknown'}
    </Badge>
  );
}
