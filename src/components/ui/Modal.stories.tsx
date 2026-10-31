import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Create New Administrator"
          description="Provision a new admin account with delegated company roles."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-name">Full Name</Label>
              <Input id="m-name" placeholder="e.g. Ramesh Patel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email">Work Email</Label>
              <Input id="m-email" type="email" placeholder="ramesh@realestatecrm.com" />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Create Admin</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  },
};

export const ConfirmationDialog: Story = {
  render: () => {
    const [open, setOpen] = useState(true);

    return (
      <div>
        <Button variant="outline" onClick={() => setOpen(true)}>Deactivate Account</Button>
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Deactivate Staff Account"
          description="Confirm immediate session revocation."
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to deactivate Rahul Verma? They will be immediately blocked from logging in.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => setOpen(false)}>Deactivate</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  },
};
