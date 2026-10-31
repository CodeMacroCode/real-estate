import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Plus, Trash2, ArrowRight, Download } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'ghost', 'link'],
      description: 'Visual style variant of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Physical size and padding preset',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is non-interactive',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Primary Action',
    variant: 'default',
    size: 'default',
  },
};

export const Outline: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'outline',
    size: 'default',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Action',
    variant: 'ghost',
    size: 'default',
  },
};

export const Link: Story = {
  args: {
    children: 'View details',
    variant: 'link',
  },
};

export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Large Action',
    size: 'lg',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled State',
    disabled: true,
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button variant="default">
        <Plus className="w-4 h-4 mr-2" />
        Add User
      </Button>
      <Button variant="outline">
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button variant="ghost">
        Next Step
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  ),
};

export const IconButton: Story = {
  args: {
    size: 'icon',
    variant: 'outline',
    children: <Trash2 className="w-4 h-4 text-rose-500" />,
    'aria-label': 'Delete record',
  },
};
