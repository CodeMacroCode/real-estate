"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Filter,
  RefreshCw,
  Video,
  Image as ImageIcon,
  Share2,
  ChevronLeft,
  ChevronRight,
  Plus,
  PenSquare,
  AlertCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PostEditDrawer } from "./PostEditDrawer";
import { ConnectedAccountItem } from "../ContentSocialMediaClient";
import { SUPPORTED_PLATFORMS } from "./AccountsConnectModal";

export interface ScheduledPostItem {
  _id: string;
  caption: string;
  mediaUrls: string[];
  mediaType: "none" | "image" | "video" | "carousel";
  targetAccounts: ConnectedAccountItem[];
  scheduledAt: string;
  publishedAt?: string;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  tags?: string[];
  createdAt: string;
}

interface ScheduleManagementSectionProps {
  accounts: ConnectedAccountItem[];
  onOpenCreatePost: () => void;
}

export function ScheduleManagementSection({
  accounts,
  onOpenCreatePost,
}: ScheduleManagementSectionProps) {
  const [posts, setPosts] = useState<ScheduledPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<ScheduledPostItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Weekly calendar anchor date (Start of current week: Monday)
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const q = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/social-publisher/posts${q}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setPosts(json.data);
      }
    } catch (err: any) {
      toast.error("Failed to load scheduled posts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);

  // Generate 7 days for current week (Monday - Sunday)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const prevWeek = () => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() - 7);
    setWeekStartDate(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 7);
    setWeekStartDate(d);
  };

  const currentWeekLabel = `${weekDays[0].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekDays[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const openEditDrawer = (post: ScheduledPostItem) => {
    setSelectedPost(post);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Week navigation */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={prevWeek}
              className="p-2 hover:bg-slate-50 text-slate-600 transition cursor-pointer border-r border-slate-200"
              title="Previous Week"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-3.5 py-1.5 text-xs font-bold text-slate-900 font-mono">
              {currentWeekLabel}
            </span>
            <button
              type="button"
              onClick={nextWeek}
              className="p-2 hover:bg-slate-50 text-slate-600 transition cursor-pointer border-l border-slate-200"
              title="Next Week"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={fetchPosts}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filter Pills & Create Shortcut */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 gap-1">
            {["all", "scheduled", "published", "failed"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-indigo-700 font-bold shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      {/* Publer-Style Dark-Mode Weekly Calendar Grid */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-4">
        {/* Day Column Headers */}
        <div className="grid grid-cols-7 gap-2.5 pb-3 border-b border-slate-800">
          {weekDays.map((day, idx) => {
            const isToday =
              new Date().toDateString() === day.toDateString();

            return (
              <div
                key={idx}
                className={`text-center py-2 px-1 rounded-xl transition ${
                  isToday
                    ? "bg-indigo-600/20 border border-indigo-500/50 text-indigo-400"
                    : "text-slate-400"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className={`text-sm font-extrabold font-mono mt-0.5 ${isToday ? "text-white" : "text-slate-300"}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Day Schedule Slots Grid */}
        <div className="grid grid-cols-7 gap-2.5 pt-3 min-h-[420px]">
          {weekDays.map((day, colIdx) => {
            const dayString = day.toDateString();
            const dayPosts = posts.filter(
              (p) => new Date(p.scheduledAt).toDateString() === dayString
            );

            return (
              <div
                key={colIdx}
                className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-2 flex flex-col gap-2 min-h-[380px]"
              >
                {dayPosts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-2 text-slate-600 text-[11px]">
                    <span className="opacity-40">No posts</span>
                  </div>
                ) : (
                  dayPosts.map((post) => {
                    const postTime = new Date(post.scheduledAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={post._id}
                        onClick={() => openEditDrawer(post)}
                        className="group relative bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/80 rounded-xl p-2.5 transition shadow-xs cursor-pointer space-y-2"
                      >
                        {/* Time & Status Badge */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/60">
                            <Clock className="size-2.5" />
                            {postTime}
                          </span>

                          <span
                            className={`size-2 rounded-full ${
                              post.status === "published"
                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                : post.status === "failed"
                                ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                                : "bg-blue-400 animate-pulse"
                            }`}
                            title={`Status: ${post.status}`}
                          />
                        </div>

                        {/* Media Thumbnail Preview */}
                        {post.mediaUrls && post.mediaUrls.length > 0 && (
                          <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                            {post.mediaType === "video" ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-950 text-indigo-400">
                                <Video className="size-5" />
                              </div>
                            ) : (
                              <img
                                src={post.mediaUrls[0]}
                                alt="Post media thumbnail"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              />
                            )}
                          </div>
                        )}

                        {/* Caption snippet */}
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                          {post.caption}
                        </p>

                        {/* Target Channels Matrix Icons */}
                        <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between">
                          <div className="flex items-center -space-x-1">
                            {post.targetAccounts?.slice(0, 3).map((acc) => {
                              const cfg = SUPPORTED_PLATFORMS.find((p) => p.id === acc.platform);
                              const Icon = cfg?.icon || Share2;
                              return (
                                <div
                                  key={acc._id}
                                  title={`${acc.accountName} (${acc.platform})`}
                                  className="size-4.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[9px] text-slate-300"
                                >
                                  <Icon className="size-2.5" />
                                </div>
                              );
                            })}
                            {post.targetAccounts && post.targetAccounts.length > 3 && (
                              <span className="text-[9px] text-slate-400 pl-1 font-mono">
                                +{post.targetAccounts.length - 3}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-indigo-400 font-semibold group-hover:underline flex items-center gap-0.5">
                            Edit <PenSquare className="size-2.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-over Post Edit Drawer */}
      <PostEditDrawer
        post={selectedPost}
        accounts={accounts}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onPostUpdated={fetchPosts}
        onPostDeleted={(id) => {
          setPosts((prev) => prev.filter((p) => p._id !== id));
        }}
      />
    </div>
  );
}
