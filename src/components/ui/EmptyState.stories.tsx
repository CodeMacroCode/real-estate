import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';
import { Users, FileQuestion } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: 'No Records Found',
    description: 'There are currently no items matching your filter criteria.',
    actionLabel: 'Add Record',
    onAction: () => alert('Action triggered!'),
  },
};

export const CustomIcon: Story = {
  args: {
    icon: <Users className="w-6 h-6 text-blue-500" />,
    title: 'No Staff Members Registered',
    description: 'Get started by creating your first team member or operational admin.',
    actionLabel: 'Add Staff Member',
    onAction: () => alert('Add Staff Member clicked'),
  },
};

export const InformationOnly: Story = {
  args: {
    icon: <FileQuestion className="w-6 h-6 text-slate-400" />,
    title: 'No Audit Logs Recorded',
    description: 'Security audit events will be automatically tracked here as users perform actions.',
  },
};
