"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  Video,
  Send,
  Calendar,
  Clock,
  Sparkles,
  Trash2,
  Check,
  UploadCloud,
  Loader2,
  Eye,
  Hash,
  AlertCircle,
  HelpCircle,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { ConnectedAccountItem } from "../ContentSocialMediaClient";
import { SUPPORTED_PLATFORMS } from "./AccountsConnectModal";

interface CreateAndPostSectionProps {
  accounts: ConnectedAccountItem[];
  onPostCreated: () => void;
  onOpenConnectModal: () => void;
}

export function CreateAndPostSection({
  accounts,
  onPostCreated,
  onOpenConnectModal,
}: CreateAndPostSectionProps) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    accounts.map((a) => a._id)
  );
  const [caption, setCaption] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"none" | "image" | "video">("none");
  const [isUploading, setIsUploading] = useState(false);

  // Scheduling options
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview simulator tab
  const [previewPlatform, setPreviewPlatform] = useState<string>("instagram");

  // Toggle account selection
  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedAccountIds(accounts.map((a) => a._id));
  };

  const deselectAll = () => {
    setSelectedAccountIds([]);
  };

  // Quick hashtag insertion
  const addHashtag = (tag: string) => {
    if (!caption.includes(tag)) {
      setCaption((prev) => (prev ? `${prev} ${tag}` : tag));
    }
  };

  // Mock media upload handler (Supports local image upload or Cloudinary/S3 input)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const isVideoFile = files[0].type.startsWith("video/");
      setMediaType(isVideoFile ? "video" : "image");

      // In Next.js client, upload via FormData or preview as objectURL
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Create local preview object URL for immediate responsiveness
        const previewUrl = URL.createObjectURL(file);
        newUrls.push(previewUrl);
      }

      setMediaUrls((prev) => (isVideoFile ? newUrls : [...prev, ...newUrls]));
      toast.success(`${files.length} media file(s) attached successfully!`);
    } catch (err: any) {
      toast.error("Failed to upload media");
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (idx: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
    if (mediaUrls.length <= 1) setMediaType("none");
  };

  const handleSubmit = async (publishImmediately: boolean) => {
    if (!caption.trim()) {
      toast.error("Please enter a caption for your post");
      return;
    }

    if (selectedAccountIds.length === 0) {
      toast.error("Please select at least one social media channel to blast");
      return;
    }

    let finalScheduledAt: string | undefined = undefined;
    if (!publishImmediately) {
      if (!scheduleDate || !scheduleTime) {
        toast.error("Please select both a date and time to schedule your post");
        return;
      }
      const combined = new Date(`${scheduleDate}T${scheduleTime}`);
      if (isNaN(combined.getTime())) {
        toast.error("Invalid scheduled date or time");
        return;
      }
      if (combined.getTime() < Date.now()) {
        toast.error("Scheduled time must be in the future");
        return;
      }
      finalScheduledAt = combined.toISOString();
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/social-publisher/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim(),
          mediaUrls,
          mediaType: mediaUrls.length > 0 ? mediaType : "none",
          targetAccounts: selectedAccountIds,
          scheduledAt: finalScheduledAt,
          publishImmediately,
          tags: ["#property", "#realestate"],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit post");

      if (publishImmediately) {
        toast.success(`Post successfully published across ${selectedAccountIds.length} channel(s)!`);
      } else {
        toast.success(`Post successfully scheduled for ${new Date(finalScheduledAt!).toLocaleString()}!`);
      }

      // Reset composer
      setCaption("");
      setMediaUrls([]);
      setMediaType("none");
      setIsScheduled(false);
      setScheduleDate("");
      setScheduleTime("");

      onPostCreated();
    } catch (err: any) {
      toast.error(err.message || "Failed to process post");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-full w-fit mx-auto text-indigo-600 shadow-xs">
          <Share2 className="size-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Channels Connected</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Before creating and blasting property listings, you need to connect at least one social media channel in Section 1.
        </p>
        <button
          type="button"
          onClick={onOpenConnectModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer"
        >
          <span>Connect Your First Channel</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Columns: Post Composer & Multi-Account Blast Selector */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        {/* Multi-Account Target Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Target Publishing Channels</span>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                {selectedAccountIds.length} of {accounts.length} Selected
              </span>
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
              >
                Deselect
              </button>
            </div>
          </div>

          {/* Account Chips with check indicator */}
          <div className="flex flex-wrap gap-2">
            {accounts.map((acc) => {
              const cfg = SUPPORTED_PLATFORMS.find((p) => p.id === acc.platform);
              const isSelected = selectedAccountIds.includes(acc._id);
              const Icon = cfg?.icon || Share2;

              return (
                <button
                  key={acc._id}
                  type="button"
                  onClick={() => toggleAccount(acc._id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-900 border-indigo-400 shadow-xs ring-1 ring-indigo-400"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 opacity-70"
                  }`}
                >
                  <div className={`p-1 rounded bg-white shadow-2xs ${cfg?.color || "text-indigo-600"}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <span className="max-w-[120px] truncate">{acc.accountName}</span>
                  {isSelected && (
                    <span className="size-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Caption Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900">
              Post Caption &amp; Listing Copy *
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              {caption.length} characters
            </span>
          </div>
          <textarea
            rows={5}
            required
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your property marketing description, key amenities, pricing, RERA info, and CTA..."
            className="w-full p-3.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 leading-relaxed placeholder:text-slate-400"
          />

          {/* Hashtag Helper Pills */}
          <div className="flex items-center flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Hash className="size-3" /> Insert:
            </span>
            {["#RealEstateNagpur", "#LuxuryFlats", "#CommercialPlots", "#PropertyForSale", "#NewLaunch"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addHashtag(tag)}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Media Uploader (Images & Video Walkthroughs) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span>Property Photos &amp; Video Walkthroughs</span>
            <span className="text-[10px] font-normal text-slate-400">
              Supported: JPG, PNG, WEBP, MP4, MOV
            </span>
          </label>

          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center transition bg-slate-50/50">
            <input
              type="file"
              id="social-media-file-input"
              multiple
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className="hidden"
            />
            <label
              htmlFor="social-media-file-input"
              className="cursor-pointer block space-y-1.5"
            >
              <div className="p-2.5 bg-white border border-slate-200 rounded-full w-fit mx-auto text-indigo-600 shadow-2xs">
                {isUploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <UploadCloud className="size-5" />
                )}
              </div>
              <div className="text-xs font-bold text-slate-800">
                Click to attach Photos or Video Tour
              </div>
              <p className="text-[10px] text-slate-400">
                Attach property photos for carousel feeds or an MP4 video for reels &amp; YouTube walkthroughs.
              </p>
            </label>
          </div>

          {/* Attached Media Thumbnails */}
          {mediaUrls.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1">
              {mediaUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group size-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 shadow-2xs"
                >
                  {mediaType === "video" ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                      <Video className="size-6 text-indigo-400" />
                    </div>
                  ) : (
                    <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduling Toggle & DateTime Picker */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-indigo-600" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Schedule Post</span>
                <span className="text-[11px] text-slate-500">
                  Pick a future date and time to broadcast automatically.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsScheduled(!isScheduled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isScheduled ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isScheduled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {isScheduled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Target Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Target Time *
                </label>
                <input
                  type="time"
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          {!isScheduled ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Publish Immediately</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Clock className="size-3.5" />
                  <span>Schedule Post</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Right 5 Columns: Live Social Media Preview Simulator */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Eye className="size-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900">Live Channel Preview</h3>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            {["instagram", "facebook", "linkedin", "telegram"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreviewPlatform(p)}
                className={`px-2 py-0.5 rounded-md font-semibold capitalize transition cursor-pointer ${
                  previewPlatform === p
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Phone Mockup Frame */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 shadow-inner">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                RE
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">Prestige Realty Official</div>
                <div className="text-[10px] text-slate-400 capitalize">Sponsored &bull; {previewPlatform}</div>
              </div>
            </div>

            {/* Media Area */}
            <div className="aspect-[4/3] bg-slate-900 flex items-center justify-center relative overflow-hidden">
              {mediaUrls.length > 0 ? (
                mediaType === "video" ? (
                  <div className="text-center text-white space-y-1">
                    <Video className="size-10 mx-auto text-indigo-400" />
                    <span className="text-[11px] font-semibold block">Property Walkthrough Video Attached</span>
                  </div>
                ) : (
                  <img src={mediaUrls[0]} alt="Post preview" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="text-center text-slate-500 p-6 space-y-1">
                  <ImageIcon className="size-8 mx-auto text-slate-600" />
                  <span className="text-[11px] font-medium block">No media attached</span>
                </div>
              )}
            </div>

            {/* Caption Preview */}
            <div className="p-3.5 space-y-1.5">
              <p className="text-xs text-slate-800 leading-relaxed line-clamp-4 whitespace-pre-line">
                {caption || "Your post description will appear here as you type in the editor..."}
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                {isScheduled
                  ? `Scheduled: ${scheduleDate || "Date"} at ${scheduleTime || "Time"}`
                  : "Immediate Broadcast Ready"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
