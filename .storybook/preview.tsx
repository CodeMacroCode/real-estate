import React from 'react';
import type { Preview } from '@storybook/nextjs';
import '../src/app/globals.css';
import { AuthProvider } from '../src/components/providers/AuthProvider';
import { mockSuperAdminUser, mockSuperAdminRole } from './mocks';
import { Toaster } from 'sonner';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/dashboard',
        query: {},
      },
    },
    viewport: {
      options: {
        mobile: {
          name: 'Mobile (375px)',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet (768px)',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop (1280px)',
          styles: { width: '1280px', height: '800px' },
        },
        wide: {
          name: 'Wide Desktop (1440px)',
          styles: { width: '1440px', height: '900px' },
        },
      }
    },
    backgrounds: {
      options: {
        "app-surface": { name: 'app-surface', value: '#f8fafc' },
        white: { name: 'white', value: '#ffffff' },
        dark: { name: 'dark', value: '#0f172a' }
      }
    },
    a11y: {
      config: {},
      options: {
        checks: { 'color-contrast': { options: { noScroll: true } } },
        restoreScroll: true,
      },
    },
  },

  decorators: [
    (Story, context) => {
      const user = context.parameters?.auth?.user ?? mockSuperAdminUser;
      const role = context.parameters?.auth?.role ?? mockSuperAdminRole;

      return (
        <AuthProvider user={user} role={role}>
          <div className="font-sans antialiased text-slate-900 p-4">
            <Story />
            <Toaster position="top-right" richColors />
          </div>
        </AuthProvider>
      );
    },
  ],

  initialGlobals: {
    viewport: {
      value: 'responsive',
      isRotated: false
    },

    backgrounds: {
      value: 'app-surface'
    }
  }
};

export default preview;
