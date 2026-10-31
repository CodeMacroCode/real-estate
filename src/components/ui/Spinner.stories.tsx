import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Spinner,
  LinearProgress,
  CenteredGlassOverlay,
  LoadingOverlay,
} from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "UI/Loaders",
  component: Spinner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: {
    size: "md",
    className: "text-blue-600",
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="sm" className="text-blue-600" />
        <span className="text-xs text-slate-500 font-mono">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="md" className="text-blue-600" />
        <span className="text-xs text-slate-500 font-mono">md</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" className="text-blue-600" />
        <span className="text-xs text-slate-500 font-mono">lg</span>
      </div>
    </div>
  ),
};

export const LinearProgressBar: Story = {
  render: () => (
    <div className="w-96 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Linear Top Progress Indicator</span>
        <span className="font-semibold text-blue-600">Active</span>
      </div>
      <LinearProgress />
    </div>
  ),
};

export const CenteredGlassOverlayStory: Story = {
  render: () => (
    <div className="relative w-[500px] h-72 rounded-2xl border border-slate-200 bg-slate-50 p-6 overflow-hidden">
      <div className="space-y-3">
        <div className="h-6 w-1/3 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse" />
      </div>
      <CenteredGlassOverlay
        message="Loading Admin Directory…"
        subMessage="Querying latest user and role records"
      />
    </div>
  ),
};

export const StandardLoadingOverlay: Story = {
  render: () => (
    <div className="w-[450px] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <LoadingOverlay message="Querying staff database…" />
    </div>
  ),
};
