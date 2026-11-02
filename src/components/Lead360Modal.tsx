"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  User,
  MapPin,
  Video,
  CheckCircle2,
  HelpCircle,
  XCircle,
  FileText,
  PhoneCall,
  Phone,
  ExternalLink,
  DollarSign,
  MessageCircle,
  Copy,
  Layers,
  Building,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";

interface Lead360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
}

export default function Lead360Modal({
  isOpen,
  onClose,
  leadId,
}: Lead360ModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active filter tab: "all", "meetings", "feedback", "upcoming"
  const [activeTab, setActiveTab] = useState<"all" | "meetings" | "feedback" | "upcoming">("all");
  const [searchEvent, setSearchEvent] = useState("");
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");

  // Collapse toggles for timeline cards
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    async function fetchTimeline() {
      if (!leadId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/appointments/lead-timeline/${leadId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load lead 360 timeline");
        }
      } catch (err: any) {
        setError(err.message || "Error loading timeline");
      } finally {
        setLoading(false);
      }
    }

    if (isOpen && leadId) {
      fetchTimeline();
    }
  }, [isOpen, leadId]);

  // Lock background window scroll when modal is open so only modal content scrolls
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lead = data?.lead;
  const client = data?.client;
  const metrics = data?.metrics;
  const appointments: any[] = data?.appointments || [];
  const confirmations: any[] = data?.confirmations || [];

  // Calculate velocity and touchpoints
  const totalTouchpoints = 1 + appointments.length + confirmations.length;
  const completedTouchpoints =
    1 +
    appointments.filter((a) => a.status === "Completed" || a.outcome).length +
    confirmations.length;
  const velocityPercent = Math.min(
    100,
    Math.round((completedTouchpoints / Math.max(1, totalTouchpoints)) * 100)
  );

  // Determine stage label
  let stageLabel = "In Progress";
  let stageColorClass = "text-blue-600";
  if (lead?.status === "Completed") {
    stageLabel = "Won / Converted";
    stageColorClass = "text-emerald-600";
  } else if (lead?.status === "Rejected") {
    stageLabel = "Disqualified";
    stageColorClass = "text-rose-600";
  } else if (appointments.length === 0) {
    stageLabel = "Prospect";
    stageColorClass = "text-purple-600";
  }

  const latestOutcome = metrics?.latestOutcome || (appointments.length > 0 ? appointments[appointments.length - 1]?.outcome : "Pending");

  // Tab counts
  const meetingsCount = appointments.length;
  const feedbackCount = confirmations.length;
  const upcomingCount = appointments.filter(
    (a) => a.status === "Scheduled" || new Date(a.meetingDate) > new Date()
  ).length;

  const copyPhone = () => {
    if (lead?.clientPhone) {
      navigator.clipboard.writeText(lead.clientPhone);
      toast.success("Phone copied to clipboard");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog - Fixed and stable, with fixed header and footer and internal scroll */}
      <div className="relative rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-4xl z-10 border border-slate-200 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
          {/* Top Bar Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Lead 360° timeline
                </h3>
                <span className="text-slate-300 font-normal">•</span>
                <span className="text-xs font-semibold text-slate-700">
                  {lead?.leadTitle || "Lead Details"}
                </span>
                {lead?.clientName && (
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {lead.clientName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Pill */}
              {lead?.status && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    lead.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : lead.status === "Rejected"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      lead.status === "Completed"
                        ? "bg-emerald-500"
                        : lead.status === "Rejected"
                        ? "bg-rose-500"
                        : "bg-blue-500"
                    }`}
                  />
                  {lead.status}
                </span>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Spinner className="w-8 h-8 text-blue-600" />
                <span className="text-xs text-slate-400">Loading lead intelligence...</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            {!loading && lead && (
              <>
                {/* 1. Four Header Cards (CLIENT, CONTACT, VELOCITY, STAGE) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* CLIENT */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <User className="w-3 h-3" />
                      <span>CLIENT</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {lead.clientName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {client?.companyName || lead.clientName}
                    </div>
                  </div>

                  {/* CONTACT */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Phone className="w-3 h-3" />
                      <span>CONTACT</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">
                        {lead.clientPhone}
                      </span>
                      <button
                        type="button"
                        onClick={copyPhone}
                        className="text-slate-400 hover:text-slate-600"
                        title="Copy phone"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {lead.clientEmail || "—"}
                    </div>
                  </div>

                  {/* VELOCITY */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        <span>VELOCITY</span>
                      </div>
                      <span className="text-xs font-bold text-blue-600">{velocityPercent}%</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {totalTouchpoints} touchpoints
                    </div>
                    {/* Blue progress bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${velocityPercent}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {completedTouchpoints} of {totalTouchpoints} done
                    </div>
                  </div>

                  {/* STAGE */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      <span>STAGE</span>
                    </div>
                    <div className={`text-sm font-bold flex items-center gap-1.5 ${stageColorClass}`}>
                      {lead.status === "Rejected" && <XCircle className="w-4 h-4 text-rose-500" />}
                      {lead.status === "Completed" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {lead.status !== "Rejected" && lead.status !== "Completed" && (
                        <Clock className="w-4 h-4 text-blue-500" />
                      )}
                      <span>{stageLabel}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Latest: <span className="font-semibold text-slate-700">{latestOutcome || "Active"}</span>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  {/* Left Tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab("all")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                        activeTab === "all"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All <span className="ml-1 text-[11px] text-slate-400">{totalTouchpoints}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("meetings")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                        activeTab === "meetings"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Meetings <span className="ml-1 text-[11px] text-slate-400">{meetingsCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("feedback")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                        activeTab === "feedback"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Feedback <span className="ml-1 text-[11px] text-slate-400">{feedbackCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("upcoming")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                        activeTab === "upcoming"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Upcoming <span className="ml-1 text-[11px] text-slate-400">{upcomingCount}</span>
                    </button>
                  </div>

                  {/* Right Search & Sort */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                      <input
                        type="text"
                        value={searchEvent}
                        onChange={(e) => setSearchEvent(e.target.value)}
                        placeholder="Search events..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setSortOrder(sortOrder === "oldest" ? "newest" : "oldest")}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition flex items-center gap-1 shrink-0"
                    >
                      <span>⇅</span>
                      <span>{sortOrder === "oldest" ? "Oldest first" : "Newest first"}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Chronological Timeline Cards */}
                <div className="space-y-4 pt-2">
                  {/* Step 1: Lead Captured (Always present) */}
                  {(activeTab === "all" || activeTab === "feedback") && (
                    <div className="flex items-start gap-3">
                      {/* Left icon badge */}
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>

                      {/* Main Card */}
                      <div className="flex-1 rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                        <div
                          className="p-4 cursor-pointer hover:bg-slate-50/50 transition flex items-start justify-between"
                          onClick={() => toggleCollapse("lead_captured")}
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900">
                                Lead Captured
                              </h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                                Origin
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(lead.createdAt).toLocaleDateString("en-GB", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                                ,{" "}
                                {new Date(lead.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            {/* Meta info tags */}
                            <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span>Source: <strong className="font-semibold text-slate-800">{lead.source}</strong></span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>Branch: <strong className="font-semibold text-slate-800">{lead.adminId?.branch || lead.assignedSubRoleId?.branch || "Ani Branch"}</strong></span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>Supervisor: <strong className="font-semibold text-slate-800">{lead.assignedSubRoleId?.name || lead.adminId?.name || "Ani Supervisor"}</strong></span>
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-2">
                              Lead initiated in CRM and assigned to operational pipeline.
                            </p>
                          </div>

                          <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
                            {collapsedCards["lead_captured"] ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Collapsible raw answers if open */}
                        {!collapsedCards["lead_captured"] && lead.rawSubmissionData && Object.keys(lead.rawSubmissionData).length > 0 && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50">
                            <div className="text-[11px] font-bold text-slate-700 mb-1.5">
                              Submitted Inbound Answers:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {Object.entries(lead.rawSubmissionData).map(([k, v]) => (
                                <div key={k} className="p-2 rounded bg-white border border-slate-200">
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                                    {k.replace(/_/g, " ")}
                                  </span>
                                  <span className="font-semibold text-slate-800">
                                    {String(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 2+: Chained Meetings / Appointments */}
                  {(activeTab === "all" || activeTab === "meetings" || activeTab === "upcoming") &&
                    appointments.map((appt: any, idx: number) => {
                      const apptId = appt._id || `appt_${idx}`;
                      const isDeclined = appt.outcome === "NO";
                      const isConfirmed = appt.outcome === "YES";
                      const isMaybe = appt.outcome === "MAYBE";

                      return (
                        <div key={apptId} className="flex items-start gap-3">
                          {/* Left icon badge */}
                          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                            <Building className="w-4 h-4" />
                          </div>

                          {/* Main Card */}
                          <div className="flex-1 rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                            <div
                              className="p-4 cursor-pointer hover:bg-slate-50/50 transition flex items-start justify-between"
                              onClick={() => toggleCollapse(apptId)}
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-slate-900">
                                    Meeting #{appt.meetingSequence || idx + 1}
                                  </h4>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                    {appt.meetingType || "In-Person"}
                                  </span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(appt.meetingDate).toLocaleDateString("en-GB", {
                                      weekday: "short",
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                    ,{" "}
                                    {new Date(appt.meetingDate).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>

                                {/* Meta details */}
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                                  <span className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Rep: <strong className="font-semibold text-slate-800">{appt.assignedSubRoleId?.name || "Ani Supervisor"}</strong></span>
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Agenda: <strong className="font-semibold text-slate-800">{appt.agenda || "Product Demo"}</strong></span>
                                  </span>
                                </div>

                                {/* Venue Highlight Box */}
                                {appt.meetingLocation && (
                                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 flex items-center gap-2 text-xs text-slate-800">
                                    <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>
                                      <strong>Venue:</strong> {appt.meetingLocation}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Outcome Pill */}
                                {isDeclined && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Declined</span>
                                  </span>
                                )}
                                {isConfirmed && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Confirmed</span>
                                  </span>
                                )}
                                {isMaybe && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>Rescheduled</span>
                                  </span>
                                )}

                                <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
                                  {collapsedCards[apptId] ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Showing {totalTouchpoints} of {totalTouchpoints} activities</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition"
            >
              Close
            </button>
          </div>
        </div>
    </div>
  );
}
