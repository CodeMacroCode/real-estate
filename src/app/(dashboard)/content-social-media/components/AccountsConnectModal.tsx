"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  Loader2,
  ChevronRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { SocialPlatform, SocialAccountType } from "@/models/SocialPublisher";

// Facebook Icon
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// Instagram Brand Gradient Icon
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// Facebook Icon badge
function FacebookBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  tagline: string;
  badge: string;
  color: string;
  bgLight: string;
  borderColor: string;
  icon: any;
  subTypes: Array<{ label: string; value: SocialAccountType }>;
  instructions: string;
}

export const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  {
    id: "facebook",
    name: "Facebook",
    tagline: "Publish to Pages, Locations & Community",
    badge: "Official Page",
    color: "text-blue-500",
    bgLight: "bg-blue-50/70 hover:bg-blue-50",
    borderColor: "border-blue-200",
    icon: FacebookIcon,
    subTypes: [{ label: "Page", value: "page" }],
    instructions: "Publish listings, reels, and video updates directly onto your official Facebook Page.",
  },
  {
    id: "instagram",
    name: "Instagram",
    tagline: "Professional Photos & Video Reels",
    badge: "Professional / Creator",
    color: "text-pink-600",
    bgLight: "bg-pink-50/70 hover:bg-pink-50",
    borderColor: "border-pink-200",
    icon: InstagramIcon,
    subTypes: [
      { label: "Business Account", value: "business" },
      { label: "Creator Profile", value: "profile" },
    ],
    instructions: "Publish high-resolution photo carousels, property reels, and stories directly to your Instagram profile.",
  },
];

interface AccountsConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountLinked: () => void;
}

type ModalViewType = "channels" | "instagram_select" | "instagram_via_fb" | "instagram_direct" | "facebook_select";

export function AccountsConnectModal({
  isOpen,
  onClose,
  onAccountLinked,
}: AccountsConnectModalProps) {
  const [currentView, setCurrentView] = useState<ModalViewType>("channels");
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isOpen) return null;

  const handleFacebookPageConnect = () => {
    setIsRedirecting(true);
    // Direct redirect to Facebook OAuth login for official Page
    window.location.href = `/api/social-publisher/oauth/facebook?subType=page`;
  };

  const handleFacebookPersonalConnect = () => {
    setIsRedirecting(true);
    // Direct redirect to Facebook OAuth login for Personal Profile
    window.location.href = `/api/social-publisher/oauth/facebook?subType=profile`;
  };

  const handleInstagramContinue = (flow: "via_facebook" | "direct_instagram") => {
    setIsRedirecting(true);
    if (flow === "via_facebook") {
      window.location.href = `/api/social-publisher/oauth/instagram?subType=page`;
    } else {
      window.location.href = `/api/social-publisher/oauth/instagram?subType=instagram_direct`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#14181f] text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col">
        {/* VIEW 1: Primary Selection Modal - Showing Facebook & Instagram (Matching Image 1) */}
        {currentView === "channels" && (
          <div>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-800/80">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Connect Channels</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select a network to link with your agency dashboard</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Platform Grid (Matching Image 1: Facebook & Instagram) */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Facebook Button */}
                <button
                  type="button"
                  onClick={() => setCurrentView("facebook_select")}
                  className="p-5 rounded-2xl border border-slate-800/90 bg-[#1b222d] hover:bg-[#222b39] hover:border-slate-700 transition flex flex-col items-center justify-center text-center group cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-full bg-[#1877F2] flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition mb-3">
                    <FacebookIcon className="size-7" />
                  </div>
                  <span className="text-sm font-bold text-white">Facebook</span>
                </button>

                {/* Instagram Button */}
                <button
                  type="button"
                  onClick={() => setCurrentView("instagram_select")}
                  className="p-5 rounded-2xl border border-slate-800/90 bg-[#1b222d] hover:bg-[#222b39] hover:border-slate-700 transition flex flex-col items-center justify-center text-center group cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition mb-3">
                    <InstagramIcon className="size-7" />
                  </div>
                  <span className="text-sm font-bold text-white">Instagram</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Facebook Sub-Modal (Showing Page Option) (Matching Image 2) */}
        {currentView === "facebook_select" && (
          <div>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white shadow-md">
                  <FacebookIcon className="size-5" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">Facebook</h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView("channels")}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* 1st Option: Personal Profile */}
                <button
                  type="button"
                  disabled={isRedirecting}
                  onClick={handleFacebookPersonalConnect}
                  className="p-5 rounded-2xl border border-slate-800/90 bg-[#1b222d] hover:bg-[#222b39] hover:border-slate-700 transition flex flex-col items-center justify-center text-center group cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition mb-3">
                    <svg className="size-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-white">Profile</span>
                  <span className="text-xs text-slate-400 mt-0.5">(via reminders)</span>
                </button>

                {/* 2nd Option: Facebook Page */}
                <button
                  type="button"
                  disabled={isRedirecting}
                  onClick={handleFacebookPageConnect}
                  className="p-5 rounded-2xl border border-slate-800/90 bg-[#1b222d] hover:bg-[#222b39] hover:border-slate-700 transition flex flex-col items-center justify-center text-center group cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition mb-3">
                    <svg className="size-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 2v20h2v-8h8l2-4-2-4H6V2H4z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-white">Page</span>
                  <span className="text-xs text-slate-400 mt-0.5">Publish to Page</span>
                </button>
              </div>

              <div className="mt-6 flex justify-start">
                <button
                  type="button"
                  onClick={() => setCurrentView("channels")}
                  className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  ← Back to channels
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Instagram Choice Modal (Professional via Facebook vs via Instagram) */}
        {currentView === "instagram_select" && (
          <div>
            <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <InstagramIcon className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Instagram</h3>
                  <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5 mt-0.5">
                    <span>👉</span> Follow us on Instagram
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView("channels")}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* 1st Option: Professional (via Facebook) */}
                <button
                  type="button"
                  onClick={() => setCurrentView("instagram_via_fb")}
                  className="p-5 rounded-2xl border border-slate-800/90 bg-[#1b222d] hover:bg-[#222b39] hover:border-slate-700 transition flex flex-col items-center justify-center text-center group cursor-pointer"
                >
                  <div className="relative mb-3">
                    <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition">
                      <InstagramIcon className="size-6" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 border-2 border-[#1b222d] flex items-center justify-center text-white">
                      <FacebookBadgeIcon className="size-3" />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white">Professional</span>
                  <span className="text-xs text-slate-400 mt-0.5">(via Facebook)</span>
                </button>

                {/* 2nd Option: Professional (via Instagram) */}
                <button
                  type="button"
                  onClick={() => setCurrentView("instagram_direct")}
                  className="p-5 rounded-2xl border border-slate-800/90 bg-[#1b222d] hover:bg-[#222b39] hover:border-slate-700 transition flex flex-col items-center justify-center text-center group cursor-pointer"
                >
                  <div className="mb-3">
                    <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition">
                      <InstagramIcon className="size-6" />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white">Professional</span>
                  <span className="text-xs text-slate-400 mt-0.5">(via Instagram)</span>
                </button>
              </div>

              <div className="mt-5 flex justify-start">
                <button
                  type="button"
                  onClick={() => setCurrentView("channels")}
                  className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  ← Back to channels
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: Instagram via Facebook Pros & Cons */}
        {currentView === "instagram_via_fb" && (
          <div>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-800/80">
              <h3 className="text-base font-bold text-white tracking-tight">
                Instagram with Facebook vs. without
              </h3>
              <button
                type="button"
                onClick={() => setCurrentView("instagram_select")}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-slate-200 mb-1.5">Pros:</h4>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-300">
                  <li>
                    You <strong className="text-sky-400 font-semibold">can</strong> tag{" "}
                    <strong className="text-sky-400 font-semibold">collaborators</strong> and{" "}
                    <strong className="text-sky-400 font-semibold">products</strong>
                  </li>
                  <li>
                    Members <strong className="text-sky-400 font-semibold">can</strong> post using their own{" "}
                    <strong className="text-sky-400 font-semibold">API credentials</strong>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-1.5">Cons:</h4>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-300">
                  <li>
                    Instagram <strong className="text-sky-400 font-semibold">needs</strong> to be connected to a{" "}
                    <strong className="text-sky-400 font-semibold">Facebook Page</strong>
                  </li>
                  <li>
                    Creator accounts <strong className="text-sky-400 font-semibold">cannot</strong> post{" "}
                    <strong className="text-sky-400 font-semibold">stories</strong> automatically
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-800/60">
                <h4 className="font-bold text-slate-200 mb-1.5">In both cases:</h4>
                <ul className="list-disc pl-4 text-slate-300">
                  <li>
                    Meta API only supports{" "}
                    <strong className="text-sky-400 font-semibold">Business and Creator</strong> accounts
                  </li>
                </ul>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setCurrentView("instagram_select")}
                  className="px-5 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRedirecting}
                  onClick={() => handleInstagramContinue("via_facebook")}
                  className="inline-flex items-center gap-1.5 px-6 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm transition disabled:opacity-60 cursor-pointer"
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Redirecting...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: Instagram Direct Pros & Cons */}
        {currentView === "instagram_direct" && (
          <div>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-800/80">
              <h3 className="text-base font-bold text-white tracking-tight">
                Instagram without Facebook vs. with
              </h3>
              <button
                type="button"
                onClick={() => setCurrentView("instagram_select")}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-slate-200 mb-1.5">Pros:</h4>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-300">
                  <li>
                    You <strong className="text-sky-400 font-semibold">don&apos;t</strong> need a{" "}
                    <strong className="text-sky-400 font-semibold">Facebook Page</strong> connected to Instagram
                  </li>
                  <li>
                    Creator accounts <strong className="text-sky-400 font-semibold">can</strong> also post{" "}
                    <strong className="text-sky-400 font-semibold">stories</strong> automatically
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-1.5">Cons:</h4>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-300">
                  <li>
                    You <strong className="text-sky-400 font-semibold">cannot</strong> tag{" "}
                    <strong className="text-sky-400 font-semibold">collaborators</strong> and{" "}
                    <strong className="text-sky-400 font-semibold">products</strong>
                  </li>
                  <li>
                    Members <strong className="text-sky-400 font-semibold">cannot</strong> post using their own{" "}
                    <strong className="text-sky-400 font-semibold">API credentials</strong>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-800/60">
                <h4 className="font-bold text-slate-200 mb-1.5">In both cases:</h4>
                <ul className="list-disc pl-4 text-slate-300">
                  <li>
                    Meta API only supports{" "}
                    <strong className="text-sky-400 font-semibold">Business and Creator</strong> accounts
                  </li>
                </ul>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setCurrentView("instagram_select")}
                  className="px-5 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRedirecting}
                  onClick={() => handleInstagramContinue("direct_instagram")}
                  className="inline-flex items-center gap-1.5 px-6 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm transition disabled:opacity-60 cursor-pointer"
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Redirecting...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


