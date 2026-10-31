import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { NavigationProgress } from '@/components/ui/NavigationProgress';

export const metadata: Metadata = {
  title: 'Real Estate CRM & Admin Portal',
  description: 'Enterprise Real Estate CRM - Phase 1: Authentication, Staff Management, Roles & Permissions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased font-sans">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
