"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Video,
  Phone,
  User,
  ShieldCheck,
  Users,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface ScheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    _id: string;
    leadTitle: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    clientAddress?: string;
    adminId?: { _id: string; name: string; email: string };
    assignedSubRoleId?: { _id: string; name: string; email: string };
  } | null;
  onSuccess: () => void;
}

const PRESET_AGENDAS = [
  "Product Demo",
  "Requirement Gathering",
  "Price Negotiation",
  "Site Inspection",
  "Follow-up Call",
];

export default function ScheduleAppointmentModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: ScheduleAppointmentModalProps) {
  const [meetingMode, setMeetingMode] = useState<
    "In-Person" | "Virtual" | "Call"
  >("In-Person");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [assignTarget, setAssignTarget] = useState<"admin" | "sub_role">(
    "admin",
  );
  const [subRolesList, setSubRolesList] = useState<
    { _id: string; name: string; slug: string }[]
  >([]);
  const [selectedSubRoleId, setSelectedSubRoleId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (lead) {
      setLocation(lead.clientAddress || "");
      if (lead.assignedSubRoleId?._id) {
        setSelectedStaffId(lead.assignedSubRoleId._id);
        setAssignTarget("sub_role");
      } else {
        setAssignTarget("admin");
      }
    }
  }, [lead]);

  // Load Sub-roles (operational sub-roles excluding admin & super_admin)
  useEffect(() => {
    async function loadSubRoles() {
      if (!isOpen) return;
      setIsRolesLoading(true);
      try {
        const res = await fetch("/api/roles");
        const json = await res.json();
        if (json.success && json.data) {
          const operationalRoles = json.data.filter(
            (r: any) => r.slug !== "super_admin" && r.slug !== "admin",
          );
          setSubRolesList(operationalRoles);
        }
      } catch (err) {
        console.error("Failed to load sub-roles", err);
      } finally {
        setIsRolesLoading(false);
      }
    }
    loadSubRoles();
  }, [isOpen]);

  // Load Staff members filtered by Parent Admin and selected Sub-Role
  useEffect(() => {
    async function loadStaff() {
      if (!lead?.adminId?._id) return;
      setIsStaffLoading(true);
      try {
        let url = `/api/staff?parentAdminId=${lead.adminId._id}&limit=100`;
        if (selectedSubRoleId) {
          url += `&roleId=${selectedSubRoleId}`;
        }
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data) {
          setStaffList(json.data);
        } else {
          setStaffList([]);
        }
      } catch (err) {
        console.error("Failed to load staff for appointment", err);
        setStaffList([]);
      } finally {
        setIsStaffLoading(false);
      }
    }
    if (isOpen && lead) {
      loadStaff();
    }
  }, [isOpen, lead, selectedSubRoleId]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTime) {
      toast.error("Please select an appointment date & time");
      return;
    }
    if (!agenda.trim()) {
      toast.error("Please specify the meeting agenda / purpose");
      return;
    }

    if (assignTarget === "sub_role" && !selectedStaffId) {
      toast.error("Please select a staff member for the appointment");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        leadId: lead._id,
        agenda: agenda.trim(),
        meetingType: meetingMode,
        meetingLocation: location.trim(),
        meetingDate: new Date(dateTime).toISOString(),
        durationMinutes: 45,
      };

      if (assignTarget === "sub_role" && selectedStaffId) {
        payload.assignedSubRoleId = selectedStaffId;
      }

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.message || data.error || "Failed to schedule appointment",
        );

      toast.success("Appointment scheduled successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error creating appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full my-8 max-w-xl z-10 border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
                <Calendar className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Schedule Lead Appointment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Book a client meeting, set agenda, and assign to salesman,
                  supervisor, or branch.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto"
          >
            {/* Linked Lead Header Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {lead.leadTitle}
                </span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  Linked Lead
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="size-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{lead.clientName}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Phone className="size-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{lead.clientPhone}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="size-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">
                    {lead.clientAddress || "Location Unspecified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Meeting Mode & Date/Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meeting Mode *
                </label>
                <div className="relative">
                  <select
                    value={meetingMode}
                    onChange={(e) => setMeetingMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="In-Person">📍 In-Person Visit</option>
                    <option value="Virtual">
                      📹 Virtual Video Call (Google Meet)
                    </option>
                    <option value="Call">📞 Phone Call</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                />
              </div>
            </div>

            {/* Meeting Location */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Meeting Location / Client Address
                </label>
                {lead.clientAddress && (
                  <button
                    type="button"
                    onClick={() => setLocation(lead.clientAddress || "")}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Use Client Address
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder={
                  meetingMode === "Virtual"
                    ? "Google Meet Link auto-generated"
                    : "Enter meeting location or client site address"
                }
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Meeting Agenda / Purpose */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Meeting Agenda / Purpose
                </label>
                <span className="text-[11px] text-slate-400">
                  e.g. Product Demo
                </span>
              </div>
              <input
                type="text"
                placeholder="Enter meeting agenda or click quick preset below"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 mr-1">
                  Quick Presets:
                </span>
                {PRESET_AGENDAS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAgenda(preset)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition ${
                      agenda === preset
                        ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign Meeting To Block */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Users className="size-4 text-blue-600" />
                  <span>Assign Meeting To</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Who will conduct the appointment?
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Own Admin */}
                <button
                  type="button"
                  onClick={() => {
                    setAssignTarget("admin");
                    setSelectedStaffId("");
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    assignTarget === "admin"
                      ? "border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <ShieldCheck
                    className={`size-4 mt-0.5 ${assignTarget === "admin" ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Own Admin
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Admin conducts appointment directly
                    </div>
                  </div>
                </button>

                {/* Sub-Roles Category & Staff */}
                <button
                  type="button"
                  onClick={() => setAssignTarget("sub_role")}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    assignTarget === "sub_role"
                      ? "border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <Users
                    className={`size-4 mt-0.5 ${assignTarget === "sub_role" ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Sub-Role Staff
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Delegate to category & staff member
                    </div>
                  </div>
                </button>
              </div>

              {/* Dynamic 2-Step Picker when Sub-Role Staff is selected */}
              {assignTarget === "sub_role" && (
                <div className="pt-2 space-y-3 animate-in fade-in-50">
                  {/* Step 1: Sub-Role Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Sub-Role Category *
                    </label>
                    <select
                      value={selectedSubRoleId}
                      onChange={(e) => {
                        setSelectedSubRoleId(e.target.value);
                        setSelectedStaffId(""); // Reset staff selection when category changes
                      }}
                      disabled={isRolesLoading}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">
                        {isRolesLoading
                          ? "Loading categories..."
                          : "All Sub-Role Categories"}
                      </option>
                      {subRolesList.map((role) => (
                        <option key={role._id} value={role._id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Filter staff members by their designated department or sub-role.
                    </p>
                  </div>

                  {/* Step 2: Staff Member */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Staff Member / User *
                    </label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      disabled={isStaffLoading}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required={assignTarget === "sub_role"}
                    >
                      <option value="">
                        {isStaffLoading
                          ? "Loading staff members..."
                          : "-- Select Staff Member --"}
                      </option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.email}) {s.role?.name ? `• ${s.role.name}` : ""}
                        </option>
                      ))}
                    </select>
                    {staffList.length === 0 && !isStaffLoading && (
                      <p className="text-[11px] text-amber-600 mt-1">
                        No active staff members found for the selected category.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Calendar className="size-3.5" />
                <span>
                  {isSubmitting ? "Scheduling..." : "Schedule Appointment"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
