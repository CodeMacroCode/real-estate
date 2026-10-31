import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchableSelect, SearchableSelectOption } from './SearchableSelect';

const sampleRoles: SearchableSelectOption[] = [
  { value: 'super_admin', label: 'Super Admin', subLabel: 'Governance owner (All permissions)' },
  { value: 'admin', label: 'Admin', subLabel: 'Operations administrator' },
  { value: 'sales_executive', label: 'Sales Executive', subLabel: 'Assigned lead pipeline' },
  { value: 'property_manager', label: 'Property Manager', subLabel: 'Listing and inventory lead' },
  { value: 'website_manager', label: 'Website Manager', subLabel: 'Content and public properties' },
];

const meta: Meta<typeof SearchableSelect> = {
  title: 'UI/SearchableSelect',
  component: SearchableSelect,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SearchableSelect>;

export const Default: Story = {
  render: () => {
    const [val, setVal] = useState('');
    return (
      <div className="w-80">
        <SearchableSelect
          options={sampleRoles}
          value={val}
          onChange={setVal}
          placeholder="Select an organizational role…"
          searchPlaceholder="Filter roles by name…"
        />
      </div>
    );
  },
};

export const Preselected: Story = {
  render: () => {
    const [val, setVal] = useState('admin');
    return (
      <div className="w-80">
        <SearchableSelect
          options={sampleRoles}
          value={val}
          onChange={setVal}
          placeholder="Select an organizational role…"
        />
      </div>
    );
  },
};

export const LoadingState: Story = {
  render: () => (
    <div className="w-80">
      <SearchableSelect
        options={[]}
        value=""
        onChange={() => {}}
        isLoading={true}
        placeholder="Searching remote records…"
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-80">
      <SearchableSelect
        options={sampleRoles}
        value="super_admin"
        onChange={() => {}}
        disabled={true}
        placeholder="Select role"
      />
    </div>
  ),
};
