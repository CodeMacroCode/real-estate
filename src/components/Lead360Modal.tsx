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
  ExternalLink,
  DollarSign,
  MessageCircle,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

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

  if (!isOpen) return null;

  const lead = data?.lead;
  const client = data?.client;
  const metrics = data?.metrics;
  const appointments = data?.appointments || [];
  const confirmations = data?.confirmations || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full my-8 max-w-3xl z-10 border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
                  <Sparkles className="size-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Lead 360° Customer Intelligence & Timeline
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Full chronological lifecycle from inbound multi-channel capture
                to meeting feedback & CRM hand-off.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[calc(100vh-160px)] overflow-y-auto space-y-6">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Spinner className="w-8 h-8 text-blue-600" />
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            {!loading && lead && (
              <>
                {/* 1. Prospect Header Summary Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      Client Name
                    </span>
                    <p className="text-sm font-bold text-slate-900">
                      {lead.clientName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      Primary Phone
                    </span>
                    <p className="text-sm font-semibold text-slate-800">
                      {lead.clientPhone}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      Source Channel
                    </span>
                    <div className="mt-0.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                        {lead.source}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      Lifecycle Status
                    </span>
                    <div className="mt-0.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          lead.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : lead.status === "Rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Contact Bar */}
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${lead.clientPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                  >
                    <PhoneCall className="size-3.5" />
                    <span>Call Client</span>
                  </a>
                  <a
                    href={`https://wa.me/${lead.clientPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  {lead.clientAddress && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 ml-auto">
                      <MapPin className="size-3.5 text-slate-400" />
                      <span>{lead.clientAddress}</span>
                    </span>
                  )}
                </div>

                {/* 2. Chronological Lifecycle Timeline */}
                <div className="space-y-6 pt-2 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {/* Step 1: Inbound Lead Capture */}
                  <div className="relative flex items-start gap-4">
                    <div className="size-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm z-10 text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1 rounded-xl border border-slate-200 p-4 bg-white shadow-xs">
                      <span className="text-[10px] font-semibold text-blue-600 uppercase">
                        Inbound Lead Captured
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        {lead.leadTitle}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Inquiry received via {lead.source} on{" "}
                        {new Date(lead.createdAt).toLocaleDateString()}.
                      </p>

                      {/* Raw Submission data if any */}
                      {lead.rawSubmissionData &&
                        Object.keys(lead.rawSubmissionData).length > 0 && (
                          <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                            <span className="font-semibold text-slate-700">
                              Form Submission Answers:
                            </span>
                            {Object.entries(lead.rawSubmissionData).map(
                              ([key, val]) => (
                                <div
                                  key={key}
                                  className="flex justify-between text-[11px] text-slate-600"
                                >
                                  <span className="capitalize">
                                    {key.replace(/_/g, " ")}:
                                  </span>
                                  <span className="font-medium text-slate-900">
                                    {String(val)}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Step 2+: Chained Appointments */}
                  {appointments.map((appt: any, index: number) => (
                    <div
                      key={appt._id}
                      className="relative flex items-start gap-4"
                    >
                      <div className="size-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm z-10 text-xs font-bold">
                        {index + 2}
                      </div>
                      <div className="flex-1 rounded-xl border border-slate-200 p-4 bg-white shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">
                            Meeting #{appt.meetingSequence || index + 1} (
                            {appt.meetingType})
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600">
                            {appt.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5 text-slate-400" />
                            {new Date(
                              appt.meetingDate,
                            ).toLocaleDateString()}{" "}
                            {new Date(appt.meetingDate).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {appt.meetingLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3.5 text-slate-400" />
                              {appt.meetingLocation}
                            </span>
                          )}
                          {appt.googleCalendarLink && (
                            <a
                              href={appt.googleCalendarLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Video className="size-3.5" />
                              Google Meet
                            </a>
                          )}
                        </div>
                        {appt.agenda && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="font-semibold">Agenda:</span>{" "}
                            {appt.agenda}
                          </p>
                        )}

                        {/* Outcome Display */}
                        {appt.outcome && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                              Meeting Outcome:
                            </span>
                            {appt.outcome === "YES" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="size-3 text-emerald-600" />{" "}
                                Confirmed (Deal Won)
                              </span>
                            )}
                            {appt.outcome === "MAYBE" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                                <HelpCircle className="size-3 text-amber-600" />{" "}
                                Follow-Up Rescheduled
                              </span>
                            )}
                            {appt.outcome === "NO" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                <XCircle className="size-3 text-rose-600" />{" "}
                                Closed (Lost)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Step Final: Client Confirmation / Deal Won */}
                  {confirmations.map((conf: any) => (
                    <div
                      key={conf._id}
                      className="relative flex items-start gap-4"
                    >
                      <div className="size-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm z-10 text-xs font-bold">
                        ✓
                      </div>
                      <div className="flex-1 rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-purple-800 uppercase">
                            Client Decision Recorded ({conf.clientConfirmation})
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(conf.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {conf.clientFeedback && (
                          <p className="text-xs text-slate-700">
                            <span className="font-semibold">Notes:</span>{" "}
                            {conf.clientFeedback}
                          </p>
                        )}
                        {conf.agreedDeliveryDate && (
                          <p className="text-xs text-emerald-700 font-semibold">
                            Agreed Handover:{" "}
                            {new Date(
                              conf.agreedDeliveryDate,
                            ).toLocaleDateString()}
                          </p>
                        )}
                        {conf.quotationAmount && (
                          <p className="text-xs text-purple-700 font-bold">
                            Quotation Value: ₹
                            {Number(conf.quotationAmount).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* CRM Master Record Badge if Won */}
                  {lead.status === "Completed" && (
                    <div className="relative flex items-start gap-4">
                      <div className="size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm z-10 text-xs font-bold">
                        ★
                      </div>
                      <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">
                          Permanent CRM Directory Profile Active
                        </span>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                          This prospect is officially graduated into the
                          Permanent Client CRM Directory.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Close 360° View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
