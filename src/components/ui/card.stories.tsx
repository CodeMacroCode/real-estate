import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';
import { Users, TrendingUp } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>System Role Profile</CardTitle>
        <CardDescription>Configure authority and least-privilege lead scope.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">
          Super Administrators hold global governance rights and company-wide lead visibility across all branches.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm">Save Role</Button>
      </CardFooter>
    </Card>
  ),
};

export const MetricCard: Story = {
  render: () => (
    <Card className="w-80 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-500">Active Staff</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Users className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">42</span>
        <span className="flex items-center text-xs font-semibold text-emerald-600">
          <TrendingUp className="w-3 h-3 mr-0.5" />
          +12%
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">Across 4 regional branches</p>
    </Card>
  ),
};
