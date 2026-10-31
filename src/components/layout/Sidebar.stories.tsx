import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from './Sidebar';
import { mockSuperAdminUser, mockAdminUser, mockStaffUser } from '../../../.storybook/mocks';

const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/users',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const SuperAdminNavigation: Story = {
  args: {
    user: mockSuperAdminUser,
  },
};

export const OperationalAdminNavigation: Story = {
  args: {
    user: mockAdminUser,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/staff',
      },
    },
  },
};

export const SalesStaffNavigation: Story = {
  args: {
    user: mockStaffUser,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/leads',
      },
    },
  },
};
