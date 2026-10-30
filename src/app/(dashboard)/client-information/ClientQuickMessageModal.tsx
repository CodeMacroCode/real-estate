"use client";

import React, { useState } from "react";
import { X, MessageSquare, Mail, Send, Sparkles, Phone } from "lucide-react";
import { toast } from "sonner";

interface ClientQuickMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: "whatsapp" | "email";
  client: {
    _id: string;
    clientName: string;
    phone: string;
    email?: string;
  } | null;
}

const WHATSAPP_TEMPLATES = [
  {
    title: "Meeting Follow-Up & Feedback",
    body: "Hi {name}, thank you for your time during our recent property discussion. We'd love to know if you had any questions regarding the layout and payment plans.",
  },
  {
    title: "Quotation & Handover Confirmation",
    body: "Dear {name}, following our agreement, we are preparing your official booking agreement and handover schedule. Please let us know if you need any adjustments.",
  },
  {
    title: "Thank You & Welcome to the Family",
    body: "Congratulations {name}! We are thrilled to welcome you. Our executive team remains available at your convenience for all upcoming milestones.",
  },
];

export default function ClientQuickMessageModal({
  isOpen,
  onClose,
  channel,
  client,
}: ClientQuickMessageModalProps) {
  const [subject, setSubject] = useState("Property Inquiry & Agreement Update");
  const [message, setMessage] = useState(
    channel === "whatsapp" && client
      ? `Hello ${client.clientName}, following up regarding your property inquiry with our team.`
      : "",
  );

  if (!isOpen || !client) return null;

  const handleApplyTemplate = (body: string) => {
    setMessage(body.replace("{name}", client.clientName));
  };

  const handleSend = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (channel === "whatsapp") {
      const cleanPhone = client.phone.replace(/[^0-9]/g, "");
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");
      toast.success("Opening WhatsApp chat with pre-filled message!");
      onClose();
    } else {
      if (!client.email) {
        toast.error("Client has no registered email address");
        return;
      }
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        client.email,
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.open(gmailUrl, "_blank");
      toast.success("Opening Gmail compose with message!");
      onClose();
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
              <div
                className={`p-2.5 rounded-xl text-white shadow-md ${
                  channel === "whatsapp" ? "bg-emerald-600" : "bg-blue-600"
                }`}
              >
                {channel === "whatsapp" ? (
                  <MessageSquare className="size-5" />
                ) : (
                  <Mail className="size-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {channel === "whatsapp"
                    ? "Quick WhatsApp Direct Message"
                    : "Compose Direct Client Email"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send to {client.clientName} (
                  {channel === "whatsapp"
                    ? client.phone
                    : client.email || "No Email"}
                  )
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

          <div className="p-6 space-y-4">
            {/* Quick Templates */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                <Sparkles className="size-3.5 text-blue-600" />
                <span>Canned Outreach Templates</span>
              </div>
              <div className="space-y-1.5">
                {WHATSAPP_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl.body)}
                    className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-xs transition flex items-center justify-between group"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-blue-700">
                      {tpl.title}
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold uppercase">
                      Apply
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {channel === "email" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Message Body *
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                type="button"
                onClick={handleSend}
                className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition flex items-center gap-1.5 ${
                  channel === "whatsapp"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <Send className="size-3.5" />
                <span>
                  {channel === "whatsapp"
                    ? "Dispatch WhatsApp"
                    : "Open in Gmail"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
