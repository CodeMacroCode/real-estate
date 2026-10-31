import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
      description: 'Alert semantic status',
    },
    title: {
      control: 'text',
      description: 'Bold title text',
    },
    message: {
      control: 'text',
      description: 'Body message text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: {
    type: 'info',
    title: 'System Information',
    message: 'Maintenance window is scheduled for Sunday at 02:00 AM UTC.',
  },
};

export const Success: Story = {
  args: {
    type: 'success',
    title: 'Account Provisioned',
    message: 'Administrator Rahul Verma has been successfully created.',
    onClose: () => alert('Dismissed!'),
  },
};

export const Warning: Story = {
  args: {
    type: 'warning',
    title: 'Permission Boundary Warning',
    message: 'Admins cannot assign permissions exceeding their own company-wide scope.',
  },
};

export const ErrorState: Story = {
  args: {
    type: 'error',
    title: 'Validation Failed',
    message: 'Username "admin" is already taken by another staff member.',
    onClose: () => alert('Dismissed!'),
  },
};

export const MessageOnly: Story = {
  args: {
    type: 'info',
    message: 'Changes are automatically saved as draft.',
  },
};
