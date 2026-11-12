import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { NumberInputScrollLock } from '@/components/ui/NumberInputScrollLock';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

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
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-paper text-ink font-sans antialiased">
        <NumberInputScrollLock />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
