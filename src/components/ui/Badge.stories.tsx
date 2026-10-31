import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge, StatusBadge, LoginStatusBadge, RoleBadge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'danger', 'warning', 'info', 'purple', 'outline', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge Label',
    variant: 'default',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 items-center">
      <Badge variant="default">Default</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="purple">Purple</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const AccountStatus: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <StatusBadge status="active" />
      <StatusBadge status="inactive" />
    </div>
  ),
};

export const UserLoginStatus: Story = {
  render: () => (
    <div className="flex gap-6 items-center">
      <LoginStatusBadge status="online" />
      <LoginStatusBadge status="offline" />
      <LoginStatusBadge status="never_logged_in" />
    </div>
  ),
};

export const RoleBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 items-center">
      <RoleBadge roleSlug="super_admin" roleName="Super Admin" />
      <RoleBadge roleSlug="admin" roleName="Admin" />
      <RoleBadge roleSlug="sales_executive" roleName="Sales Executive" />
      <RoleBadge roleSlug="sales_manager" roleName="Sales Manager" />
      <RoleBadge roleSlug="property_manager" roleName="Property Manager" />
    </div>
  ),
};
