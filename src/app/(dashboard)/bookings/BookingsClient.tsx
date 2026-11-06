"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  FolderLock,
  Plus,
  Search,
  Filter,
  DollarSign,
  FileText,
  Calendar,
  Building,
  Upload,
  CheckCircle2,
  Clock,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Landmark,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { DateRangeFilter } from "@/app/componets/ui/DateRangeFilter";

interface BookingItem {
  _id: string;
  bookingNumber: string;
  clientId: {
    _id: string;
    clientName: string;
    phone: string;
    email?: string;
  };
  itemType: "ProjectUnit" | "Property";
  inventoryLabel: string;
  bookingStatus: "Hold" | "Booked" | "Sold" | "Cancelled";
  agreementValue: number;
  totalPaid: number;
  balanceAmount: number;
  payments: Array<{
    _id?: string;
    paymentType: string;
    amount: number;
    paymentMode: string;
    referenceNumber?: string;
    receiptNumber?: string;
    paymentDate: string;
    notes?: string;
  }>;
  documents: Array<{
    title: string;
    fileUrl: string;
    fileType?: string;
    uploadedAt: string;
  }>;
  loanDetails?: {
    isLoanRequired: boolean;
    bankName?: string;
    sanctionedAmount?: number;
    disbursedAmount?: number;
    loanAccountNumber?: string;
    loanStatus?: "Not Applied" | "Applied" | "In Process" | "Sanctioned" | "Disbursed" | "Rejected";
  };
  notes?: string;
  createdAt: string;
}

export default function BookingsClient({ user, role }: { user: any; role: any }) {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal: View / Manage Booking (Documents & Payments Drawer)
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "documents" | "loan">("overview");

  // Form: Record New Payment
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentType: "Part Payment",
    amount: 0,
    paymentMode: "NEFT/RTGS",
    referenceNumber: "",
    receiptNumber: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  // Form: Upload Document to Locker
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  // Form: Bank Loan Details
  const [isUpdatingLoan, setIsUpdatingLoan] = useState(false);
  const [loanForm, setLoanForm] = useState({
    isLoanRequired: false,
    bankName: "",
    sanctionedAmount: 0,
    disbursedAmount: 0,
    loanAccountNumber: "",
    loanStatus: "Not Applied",
  });

  // Fetch Bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/bookings?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setBookings(json.data.bookings || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
        setTotalCount(json.data.pagination?.total || 0);
      }
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Handle Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (paymentForm.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      setIsAddingPayment(true);
      const res = await fetch(`/api/bookings/${selectedBooking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPayment: paymentForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record payment");

      toast.success("Payment transaction recorded successfully!");
      setPaymentForm({
        paymentType: "Part Payment",
        amount: 0,
        paymentMode: "NEFT/RTGS",
        referenceNumber: "",
        receiptNumber: "",
        paymentDate: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      setSelectedBooking(json.data);
      await fetchBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsAddingPayment(false);
    }
  };

  // Handle Document Upload
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!docFile || !docTitle.trim()) {
      toast.error("Please provide both document title and file");
      return;
    }

    try {
      setIsUploadingDoc(true);
      const formData = new FormData();
      formData.append("file", docFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.data?.fileUrl) {
        throw new Error(uploadJson.error || "File upload failed");
      }

      const patchRes = await fetch(`/api/bookings/${selectedBooking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newDocument: {
            title: docTitle.trim(),
            fileUrl: uploadJson.data.fileUrl,
            fileType: docFile.type || "Document",
          },
        }),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchJson.error || "Failed to save document record");

      toast.success("Document safely stored in Document Locker!");
      setDocTitle("");
      setDocFile(null);
      setSelectedBooking(patchJson.data);
      await fetchBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Handle Loan Details Update
  const handleUpdateLoanDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    try {
      setIsUpdatingLoan(true);
      const res = await fetch(`/api/bookings/${selectedBooking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanDetails: loanForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update loan record");

      toast.success("Bank loan & financing details updated!");
      setSelectedBooking(json.data);
      await fetchBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to update loan details");
    } finally {
      setIsUpdatingLoan(false);
    }
  };

  // Quick Status Transition
  const handleUpdateBookingStatus = async (newStatus: "Hold" | "Booked" | "Sold" | "Cancelled") => {
    if (!selectedBooking) return;
    try {
      const res = await fetch(`/api/bookings/${selectedBooking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingStatus: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");

      toast.success(`Booking status changed to ${newStatus}`);
      setSelectedBooking(json.data);
      await fetchBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FolderLock className="size-6 text-blue-600" />
            <span>Client Track Record & Document Locker</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track all property & project unit bookings, payment milestone installments, bank loans, and secure client document lockers.
          </p>
        </div>
      </div>

      {/* Single-Row Unified Filter Toolbar */}
      <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Booking # or Property..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Date Range Picker */}
          <div className="w-full md:w-auto min-w-[260px]">
            <DateRangeFilter
              placeholder="Select Date Range..."
              className="w-full text-xs"
              defaultStartDate={startDate}
              defaultEndDate={endDate}
              onDateRangeChange={(start: Date | null, end: Date | null, startStr?: string, endStr?: string) => {
                setStartDate(startStr || "");
                setEndDate(endStr || "");
                setPage(1);
              }}
            />
          </div>

          {/* Status Dropdown */}
          <div className="w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-auto px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 font-medium cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="Hold">Hold</option>
              <option value="Booked">Booked</option>
              <option value="Sold">Sold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 px-4">
            <FolderLock className="size-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Client Track Records Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              When a unit or property is booked, reserved, or sold to a buyer client, their agreement value,
              installments, and document locker will appear here.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <Table maxHeight="none" containerClassName="overflow-visible">
                <TableHeader className="bg-slate-900 text-white hover:bg-slate-900 static">
                  <TableRow className="border-slate-800 hover:bg-slate-900">
                    <TableHead className="py-2.5 text-white font-bold text-xs">Booking #</TableHead>
                    <TableHead className="py-2.5 text-white font-bold text-xs">Buyer Client</TableHead>
                    <TableHead className="py-2.5 text-white font-bold text-xs">Property / Unit</TableHead>
                    <TableHead className="py-2.5 text-white font-bold text-xs">Agreement Value</TableHead>
                    <TableHead className="py-2.5 text-white font-bold text-xs">Paid / Pending</TableHead>
                    <TableHead className="py-2.5 text-white font-bold text-xs">Bank Loan</TableHead>
                    <TableHead className="py-2.5 text-white font-bold text-xs">Status</TableHead>
                    <TableHead className="py-2.5 text-white font-bold text-xs">Locker</TableHead>
                    <TableHead className="py-2.5 text-white font-bold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => {
                    let statusBadge = "bg-blue-100 text-blue-800 border-blue-200";
                    if (b.bookingStatus === "Sold") statusBadge = "bg-slate-900 text-white border-slate-950";
                    else if (b.bookingStatus === "Hold") statusBadge = "bg-amber-100 text-amber-800 border-amber-200";
                    else if (b.bookingStatus === "Cancelled")
                      statusBadge = "bg-rose-100 text-rose-800 border-rose-200";

                    return (
                      <TableRow
                        key={b._id}
                        onClick={() => {
                          setSelectedBooking(b);
                          setIsManageModalOpen(true);
                          setActiveTab("overview");
                        }}
                        className="hover:bg-slate-50 cursor-pointer transition text-xs"
                      >
                        <TableCell className="font-mono font-bold text-blue-600 py-3">
                          {b.bookingNumber}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="font-bold text-slate-900">{b.clientId?.clientName || "—"}</div>
                          <div className="text-[11px] text-slate-500">{b.clientId?.phone}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            <Building className="size-3.5 text-slate-400 shrink-0" />
                            <span>{b.inventoryLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900 py-3">
                          ₹{Number(b.agreementValue).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="py-3 font-mono">
                          <div className="text-emerald-700 font-semibold">
                            Paid: ₹{Number(b.totalPaid || 0).toLocaleString("en-IN")}
                          </div>
                          <div className="text-rose-600 font-medium text-[11px]">
                            Pending: ₹{Number(b.balanceAmount || 0).toLocaleString("en-IN")}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          {b.loanDetails?.isLoanRequired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Landmark className="size-3 text-indigo-500" />
                              <span>{b.loanDetails.loanStatus || "Applied"}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Self-Financed</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}
                          >
                            {b.bookingStatus}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            <FolderLock className="size-3 text-slate-500" />
                            <span>{b.documents?.length || 0} files</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(b);
                              setIsManageModalOpen(true);
                              setActiveTab("overview");
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition cursor-pointer"
                          >
                            Open Record & Locker &rarr;
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div>
                  Showing <span className="font-semibold text-slate-800">{bookings.length}</span> of{" "}
                  <span className="font-semibold text-slate-800">{totalCount}</span> total records
                </div>
                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                  <span className="text-slate-600">Rows per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <span className="text-xs font-semibold text-slate-700 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER / MODAL: BOOKING DETAILS, PAYMENT TRANSACTIONS & DOCUMENT LOCKER */}
      {isManageModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 font-bold">
                  <FolderLock className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">
                      {selectedBooking.bookingNumber}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedBooking.bookingStatus === "Sold"
                          ? "bg-slate-900 text-white"
                          : selectedBooking.bookingStatus === "Booked"
                            ? "bg-[#dcf836] text-slate-900"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {selectedBooking.bookingStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedBooking.inventoryLabel} • Buyer: {selectedBooking.clientId?.clientName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`py-3 border-b-2 transition cursor-pointer ${
                  activeTab === "overview"
                    ? "border-blue-600 text-blue-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Summary & Status
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("payments")}
                className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "payments"
                    ? "border-blue-600 text-blue-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Payment Installments</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  {selectedBooking.payments?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "documents"
                    ? "border-blue-600 text-blue-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Document Locker & Images</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  {selectedBooking.documents?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("loan");
                  if (selectedBooking.loanDetails) {
                    setLoanForm({
                      isLoanRequired: Boolean(selectedBooking.loanDetails.isLoanRequired),
                      bankName: selectedBooking.loanDetails.bankName || "",
                      sanctionedAmount: selectedBooking.loanDetails.sanctionedAmount || 0,
                      disbursedAmount: selectedBooking.loanDetails.disbursedAmount || 0,
                      loanAccountNumber: selectedBooking.loanDetails.loanAccountNumber || "",
                      loanStatus: selectedBooking.loanDetails.loanStatus || "Not Applied",
                    });
                  }
                }}
                className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "loan"
                    ? "border-blue-600 text-blue-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Bank Loan & Financing</span>
                {selectedBooking.loanDetails?.isLoanRequired && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Loan Active
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Financial KPI Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Total Agreement Value</div>
                      <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                        ₹{Number(selectedBooking.agreementValue).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                      <div className="text-[10px] uppercase font-bold text-emerald-600">Total Amount Received</div>
                      <div className="text-2xl font-extrabold text-emerald-800 font-mono mt-1">
                        ₹{Number(selectedBooking.totalPaid || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
                      <div className="text-[10px] uppercase font-bold text-rose-600">Pending / Balance Amount</div>
                      <div className="text-2xl font-extrabold text-rose-800 font-mono mt-1">
                        ₹{Number(selectedBooking.balanceAmount || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Buyer & Property Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-slate-800 text-sm">Buyer Client Profile</div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Name</span>
                        <span className="font-semibold text-slate-800">{selectedBooking.clientId?.clientName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Phone</span>
                        <span className="font-semibold text-slate-800">{selectedBooking.clientId?.phone}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Email</span>
                        <span className="font-semibold text-slate-800">{selectedBooking.clientId?.email || "—"}</span>
                      </div>
                      {selectedBooking.clientId?._id && (
                        <div className="pt-2">
                          <Link
                            href={`/client-information/${selectedBooking.clientId._id}`}
                            className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                          >
                            <span>Open Client CRM File</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-slate-800 text-sm">Inventory & Booking Details</div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Inventory</span>
                        <span className="font-semibold text-slate-800">{selectedBooking.inventoryLabel}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Type</span>
                        <span className="font-semibold text-slate-800">{selectedBooking.itemType}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Booked On</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {new Date(selectedBooking.createdAt).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Switcher Actions */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="text-xs font-bold text-slate-800">Update Booking Status</div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateBookingStatus("Hold")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedBooking.bookingStatus === "Hold"
                            ? "bg-amber-600 text-white"
                            : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Keep on Hold
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateBookingStatus("Booked")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedBooking.bookingStatus === "Booked"
                            ? "bg-[#dcf836] text-slate-900 border border-[#bed826]"
                            : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Active Booked
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateBookingStatus("Sold")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedBooking.bookingStatus === "Sold"
                            ? "bg-slate-900 text-white"
                            : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Sold (Contract Closed)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateBookingStatus("Cancelled")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedBooking.bookingStatus === "Cancelled"
                            ? "bg-rose-600 text-white"
                            : "bg-white border border-slate-300 text-rose-700 hover:bg-rose-50"
                        }`}
                      >
                        Cancel Booking (Release Unit)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PAYMENTS */}
              {activeTab === "payments" && (
                <div className="space-y-6">
                  {/* Record New Payment Form */}
                  <form onSubmit={handleRecordPayment} className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                    <div className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                      <CreditCard className="size-4 text-blue-600" />
                      <span>Record Payment Transaction / Installment</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Payment Stage *</label>
                        <select
                          value={paymentForm.paymentType}
                          onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="Token">Token Booking</option>
                          <option value="Part Payment">Part Payment / Milestone</option>
                          <option value="Registration">Registration / Stamp Duty</option>
                          <option value="Full Payment">Full Settlement</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="e.g. 500000"
                          value={paymentForm.amount || ""}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                        <select
                          value={paymentForm.paymentMode}
                          onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="NEFT/RTGS">NEFT / RTGS</option>
                          <option value="Cheque">Cheque</option>
                          <option value="UPI">UPI</option>
                          <option value="Demand Draft">Demand Draft</option>
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={paymentForm.paymentDate}
                          onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">UTR / Cheque / Ref #</label>
                        <input
                          type="text"
                          placeholder="e.g. UTR-HDFC982312"
                          value={paymentForm.referenceNumber}
                          onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Receipt / Invoice #</label>
                        <input
                          type="text"
                          placeholder="e.g. REC-2026-081"
                          value={paymentForm.receiptNumber}
                          onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isAddingPayment}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isAddingPayment ? "Recording..." : "Record Payment Entry"}
                      </button>
                    </div>
                  </form>

                  {/* Payment History Ledger */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-800">Transaction History</h4>
                    {(!selectedBooking.payments || selectedBooking.payments.length === 0) ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No payment entries recorded yet.</p>
                    ) : (
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                            <tr>
                              <th className="px-3 py-2 text-left">Date</th>
                              <th className="px-3 py-2 text-left">Stage</th>
                              <th className="px-3 py-2 text-left">Mode & Ref</th>
                              <th className="px-3 py-2 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedBooking.payments.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 font-mono">
                                <td className="px-3 py-2 text-slate-600 font-sans">
                                  {new Date(p.paymentDate).toLocaleDateString("en-GB")}
                                </td>
                                <td className="px-3 py-2 font-bold text-slate-800 font-sans">{p.paymentType}</td>
                                <td className="px-3 py-2 text-slate-600">
                                  <span>{p.paymentMode}</span>
                                  {p.referenceNumber && (
                                    <span className="block text-[10px] text-slate-400">Ref: {p.referenceNumber}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                  ₹{Number(p.amount).toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DOCUMENT LOCKER & IMAGES */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                  {/* Upload File to Locker Form */}
                  <form onSubmit={handleUploadDocument} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                    <div className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                      <Upload className="size-4 text-indigo-600" />
                      <span>Upload KYC / Agreement / Payment Receipt to Locker</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Client PAN & Aadhaar, Agreement Copy, Cheque Photo"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Select File (Image / PDF) *</label>
                        <input
                          type="file"
                          required
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isUploadingDoc}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isUploadingDoc ? "Uploading..." : "Save to Document Locker"}
                      </button>
                    </div>
                  </form>

                  {/* Document Locker Gallery */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs text-slate-800">Stored Documents & Images</h4>
                    {(!selectedBooking.documents || selectedBooking.documents.length === 0) ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No documents in locker yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedBooking.documents.map((doc, idx) => {
                          const isImg =
                            doc.fileUrl.match(/\.(jpeg|jpg|png|webp|gif|avif)$/i) ||
                            doc.fileType?.includes("image");
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-xl border border-slate-200 hover:border-slate-400 bg-white shadow-2xs space-y-2 flex flex-col justify-between"
                            >
                              <div>
                                {isImg ? (
                                  <div className="h-32 w-full rounded-lg bg-slate-100 overflow-hidden mb-2">
                                    <img
                                      src={doc.fileUrl}
                                      alt={doc.title}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-20 w-full rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                                    <FileText className="size-8" />
                                  </div>
                                )}
                                <div className="font-bold text-xs text-slate-900 truncate" title={doc.title}>
                                  {doc.title}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {new Date(doc.uploadedAt).toLocaleDateString("en-GB")}
                                </div>
                              </div>

                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                              >
                                <Eye className="size-3.5" />
                                <span>View Document</span>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: BANK LOAN & FINANCING TRACKER */}
              {activeTab === "loan" && (
                <div className="space-y-6">
                  <form onSubmit={handleUpdateLoanDetails} className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Bank Loan Application & Sanction Record</h4>
                        <p className="text-[11px] text-slate-500">
                          Track financial institution status, sanctioned limit, disbursed amount, and loan account number.
                        </p>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={loanForm.isLoanRequired}
                          onChange={(e) => setLoanForm({ ...loanForm, isLoanRequired: e.target.checked })}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                        />
                        <span className="text-xs font-bold text-slate-700">Bank Loan Required / Active</span>
                      </label>
                    </div>

                    {loanForm.isLoanRequired ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Financing Bank / Institution</label>
                            <input
                              type="text"
                              placeholder="e.g. HDFC Bank, SBI Home Loans, ICICI Bank"
                              value={loanForm.bankName}
                              onChange={(e) => setLoanForm({ ...loanForm, bankName: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Loan Processing Status</label>
                            <select
                              value={loanForm.loanStatus}
                              onChange={(e) => setLoanForm({ ...loanForm, loanStatus: e.target.value as any })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                            >
                              <option value="Not Applied">Not Applied</option>
                              <option value="Applied">Applied (Documents Submitted)</option>
                              <option value="In Process">In Process / Verification</option>
                              <option value="Sanctioned">Sanctioned (Offer Letter Issued)</option>
                              <option value="Disbursed">Disbursed (Funds Received)</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Sanctioned Amount (₹)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 5000000"
                              value={loanForm.sanctionedAmount || ""}
                              onChange={(e) => setLoanForm({ ...loanForm, sanctionedAmount: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Disbursed to Builder (₹)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 2500000"
                              value={loanForm.disbursedAmount || ""}
                              onChange={(e) => setLoanForm({ ...loanForm, disbursedAmount: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Loan Account / Application #</label>
                            <input
                              type="text"
                              placeholder="e.g. LAN-98124912"
                              value={loanForm.loanAccountNumber}
                              onChange={(e) => setLoanForm({ ...loanForm, loanAccountNumber: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                            />
                          </div>
                        </div>

                        {/* Loan Overview Calculation */}
                        <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs flex items-center justify-between">
                          <span className="text-slate-600">Pending Loan Disbursement to Builder:</span>
                          <span className="font-bold text-blue-900 font-mono">
                            ₹{Math.max(0, (loanForm.sanctionedAmount || 0) - (loanForm.disbursedAmount || 0)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-lg border border-slate-200">
                        No bank loan required for this booking (Self-financed / Direct Client Payment). Check the box above if the buyer seeks bank financing.
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isUpdatingLoan}
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isUpdatingLoan ? "Saving Loan Details..." : "Save Loan Record"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
