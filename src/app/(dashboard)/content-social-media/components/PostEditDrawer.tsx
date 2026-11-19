"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  Loader2,
  Video,
  Image as ImageIcon,
  Share2,
  AlertCircle,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { ScheduledPostItem } from "./ScheduleManagementSection";
import { ConnectedAccountItem } from "../ContentSocialMediaClient";
import { SUPPORTED_PLATFORMS } from "./AccountsConnectModal";

interface PostEditDrawerProps {
  post: ScheduledPostItem | null;
  accounts: ConnectedAccountItem[];
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: () => void;
  onPostDeleted: (id: string) => void;
}

export function PostEditDrawer({
  post,
  accounts,
  isOpen,
  onClose,
  onPostUpdated,
  onPostDeleted,
}: PostEditDrawerProps) {
  const [caption, setCaption] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [targetAccountIds, setTargetAccountIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (post) {
      setCaption(post.caption || "");
      setTargetAccountIds(post.targetAccounts?.map((a) => a._id) || []);

      if (post.scheduledAt) {
        const d = new Date(post.scheduledAt);
        // Format YYYY-MM-DD
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        setScheduledDate(`${year}-${month}-${day}`);

        // Format HH:MM
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        setScheduledTime(`${hours}:${mins}`);
      }
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const toggleAccount = (id: string) => {
    setTargetAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      toast.error("Caption is required");
      return;
    }

    if (targetAccountIds.length === 0) {
      toast.error("At least one channel must be targeted");
      return;
    }

    let updatedScheduledAt: string | undefined = undefined;
    if (scheduledDate && scheduledTime) {
      const combined = new Date(`${scheduledDate}T${scheduledTime}`);
      if (isNaN(combined.getTime())) {
        toast.error("Invalid scheduled date or time");
        return;
      }
      updatedScheduledAt = combined.toISOString();
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/social-publisher/posts/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim(),
          targetAccounts: targetAccountIds,
          scheduledAt: updatedScheduledAt,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update post");

      toast.success("Post updated and rescheduled successfully!");
      onPostUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to cancel and delete this scheduled post?")) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/social-publisher/posts/${post._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete post");

      toast.success("Scheduled post cancelled and removed successfully");
      onPostDeleted(post._id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                post.status === "published"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : post.status === "failed"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}>
                {post.status}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ID: {post._id.slice(-6)}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1">
              Edit &amp; Reschedule Post
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpdate} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Media Preview Box */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Attached Media Assets ({post.mediaUrls.length})
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {post.mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="size-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 relative shadow-2xs"
                  >
                    {post.mediaType === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-indigo-400">
                        <Video className="size-6" />
                      </div>
                    ) : (
                      <img src={url} alt="Attached media" className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Caption Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Caption &amp; Copywriting
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {caption.length} chars
              </span>
            </div>
            <textarea
              rows={5}
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed text-slate-800"
            />
          </div>

          {/* Reschedule Date & Time */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Clock className="size-3.5 text-indigo-600" />
              <span>Reschedule Publish Time</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Time
                </label>
                <input
                  type="time"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Target Platforms Strip */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Target Publishing Channels
            </label>
            <div className="flex flex-wrap gap-1.5">
              {accounts.map((acc) => {
                const cfg = SUPPORTED_PLATFORMS.find((p) => p.id === acc.platform);
                const isSelected = targetAccountIds.includes(acc._id);
                const Icon = cfg?.icon || Share2;

                return (
                  <button
                    key={acc._id}
                    type="button"
                    onClick={() => toggleAccount(acc._id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-900 border-indigo-400 ring-1 ring-indigo-400"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 opacity-60"
                    }`}
                  >
                    <Icon className="size-3" />
                    <span className="truncate max-w-[100px]">{acc.accountName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              <span>{isDeleting ? "Cancelling..." : "Cancel Post"}</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || post.status === "published"}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Save &amp; Reschedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
