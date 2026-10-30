"use client";

import React, { useState } from "react";
import { X, Pencil, Calendar, Clock, MapPin, Video } from "lucide-react";
import { toast } from "sonner";

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    _id: string;
    clientName: string;
    meetingDate: string;
    meetingType: "In-Person" | "Virtual" | "Call";
    meetingLocation?: string;
    agenda: string;
    durationMinutes: number;
  } | null;
  onSuccess: () => void;
}

export default function EditAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: EditAppointmentModalProps) {
  const [dateTime, setDateTime] = useState(
    appointment?.meetingDate
      ? new Date(appointment.meetingDate).toISOString().slice(0, 16)
      : "",
  );
  const [meetingType, setMeetingType] = useState<
    "In-Person" | "Virtual" | "Call"
  >(appointment?.meetingType || "Virtual");
  const [location, setLocation] = useState(appointment?.meetingLocation || "");
  const [agenda, setAgenda] = useState(appointment?.agenda || "");
  const [duration, setDuration] = useState(
    appointment?.durationMinutes ? String(appointment.durationMinutes) : "30",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTime) {
      toast.error("Please specify meeting date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingDate: new Date(dateTime).toISOString(),
          meetingType,
          meetingLocation: location.trim(),
          agenda: agenda.trim(),
          durationMinutes: Number(duration) || 30,
        }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.message || json.error || "Failed to update appointment",
        );

      toast.success("Appointment updated & Google Calendar synced!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full my-8 max-w-lg z-10 border border-slate-200 overflow-hidden">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
                <Pencil className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Appointment Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update time, mode, or agenda for {appointment.clientName}
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

          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meeting Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meeting Mode *
                </label>
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Virtual">📹 Virtual (Google Meet)</option>
                  <option value="In-Person">📍 In-Person</option>
                  <option value="Call">📞 Phone Call</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location / Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Gallery or Client Office"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (Mins)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Agenda & Notes *
              </label>
              <textarea
                rows={3}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Update Appointment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
