import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { Label } from './label';
import { Search } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether input is disabled',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder string',
    },
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'number', 'tel'],
      description: 'HTML input type',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text…',
    className: 'w-72',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled field',
    disabled: true,
    value: 'Readonly value',
    className: 'w-72',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: '••••••••',
    className: 'w-72',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-72 space-y-1.5">
      <Label htmlFor="email">Email Address</Label>
      <Input id="email" type="email" placeholder="admin@realestatecrm.com" />
      <p className="text-xs text-slate-500">We will send verification credentials here.</p>
    </div>
  ),
};

export const WithSearchIcon: Story = {
  render: () => (
    <div className="relative w-80">
      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
      <Input className="pl-9" placeholder="Search admins by name or username…" />
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="w-72 space-y-1.5">
      <Label htmlFor="err-input" className="text-rose-600">Username</Label>
      <Input id="err-input" defaultValue="user#invalid" className="border-rose-400 focus-visible:ring-rose-500" />
      <p className="text-xs text-rose-500">Username can only contain lowercase letters, numbers, and hyphens.</p>
    </div>
  ),
};
