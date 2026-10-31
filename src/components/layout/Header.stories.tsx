import type { Meta, StoryObj } from '@storybook/react';
import { Header } from './Header';
import { mockSuperAdminUser, mockAdminUser } from '../../../.storybook/mocks';

const meta: Meta<typeof Header> = {
  title: 'Layout/Header',
  component: Header,
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
type Story = StoryObj<typeof Header>;

export const SuperAdminView: Story = {
  args: {
    user: mockSuperAdminUser,
  },
};

export const ImpersonatingAdminView: Story = {
  args: {
    user: {
      ...mockAdminUser,
      isImpersonating: true,
      impersonator: {
        userId: mockSuperAdminUser._id,
        email: mockSuperAdminUser.email,
        name: mockSuperAdminUser.name,
      },
    },
  },
};
