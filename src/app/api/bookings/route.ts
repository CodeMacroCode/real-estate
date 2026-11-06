import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Booking } from "@/models/Booking";
import { ProjectUnit } from "@/models/ProjectUnit";
import { Property } from "@/models/Property";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { recalculateProjectCounters } from "@/services/projectService";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings
 * Returns bookings filtered by adminId scope, search, status, and dates
 */
export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const clientId = searchParams.get("clientId")?.trim() || "";
    const startDate = searchParams.get("startDate")?.trim() || "";
    const endDate = searchParams.get("endDate")?.trim() || "";

    const query: any = {};

    const roleSlug = authContext.role?.slug || "";
    const isSuperAdmin = roleSlug === "super_admin";
    const isAdmin = roleSlug === "admin";

    // 3-Tier Multi-Tenant Scoping
    if (isSuperAdmin) {
      const adminFilter = searchParams.get("adminFilter");
      if (adminFilter) {
        query.adminId = new mongoose.Types.ObjectId(adminFilter);
      }
    } else if (isAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      const parentAdminId = authContext.user.parentAdminId;
      if (parentAdminId) {
        query.adminId = new mongoose.Types.ObjectId(parentAdminId.toString());
      }
    }

    if (status && status !== "ALL") {
      query.bookingStatus = status;
    }

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      query.clientId = new mongoose.Types.ObjectId(clientId);
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { inventoryLabel: { $regex: search, $options: "i" } },
      ];
    }

    const [total, bookings] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .populate("clientId", "clientName phone email address companyName")
        .populate("projectId", "name projectId developerName")
        .populate(
          "projectUnitId",
          "unitNumber towerName floorNumber unitType carpetArea price status",
        )
        .populate(
          "propertyId",
          "propertyId title propertyType pricing location status",
        )
        .populate("createdById", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return jsonResponse({
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("GET /api/bookings error:", error);
    return errorResponse(error.message || "Failed to load bookings", 500);
  }
}

/**
 * POST /api/bookings
 * Create a new Booking & Allotment record with Client link, inventory status update, and optional initial payment & documents
 */
export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();
    const body = await req.json();

    const {
      clientId,
      itemType, // "ProjectUnit" | "Property"
      projectId,
      projectUnitId,
      propertyId,
      inventoryLabel,
      bookingStatus = "Booked",
      agreementValue,
      initialPayment,
      documents = [],
      notes,
    } = body;

    if (!clientId) {
      return errorResponse("Buyer Client is required", 400);
    }
    if (!itemType || !inventoryLabel) {
      return errorResponse("Inventory details are required", 400);
    }
    if (
      agreementValue === undefined ||
      agreementValue === null ||
      Number(agreementValue) < 0
    ) {
      return errorResponse("Agreement / Deal value is required", 400);
    }

    const roleSlug = authContext.role?.slug || "";
    let adminId: mongoose.Types.ObjectId;
    if (roleSlug === "super_admin" && body.adminId) {
      adminId = new mongoose.Types.ObjectId(body.adminId);
    } else if (roleSlug === "admin") {
      adminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      adminId = new mongoose.Types.ObjectId(
        (authContext.user.parentAdminId || authContext.user._id).toString()
      );
    }

    // Generate unique booking number: BKG-YYYYMMDD-XXXX
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BKG-${datePrefix}-${randomSuffix}`;

    const paymentsList: any[] = [];
    if (initialPayment && Number(initialPayment.amount) > 0) {
      paymentsList.push({
        paymentType: initialPayment.paymentType || "Token",
        amount: Number(initialPayment.amount),
        paymentMode: initialPayment.paymentMode || "NEFT/RTGS",
        referenceNumber: initialPayment.referenceNumber,
        receiptNumber: initialPayment.receiptNumber,
        paymentDate: initialPayment.paymentDate
          ? new Date(initialPayment.paymentDate)
          : new Date(),
        notes: initialPayment.notes,
      });
    }

    const newBooking = new Booking({
      adminId,
      bookingNumber,
      clientId: new mongoose.Types.ObjectId(clientId),
      itemType,
      projectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
      projectUnitId: projectUnitId
        ? new mongoose.Types.ObjectId(projectUnitId)
        : undefined,
      propertyId: propertyId
        ? new mongoose.Types.ObjectId(propertyId)
        : undefined,
      inventoryLabel,
      bookingStatus,
      agreementValue: Number(agreementValue),
      payments: paymentsList,
      documents: Array.isArray(documents) ? documents : [],
      notes,
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    await newBooking.save();

    // Synchronize inventory status & client assignment
    if (itemType === "ProjectUnit" && projectUnitId) {
      await ProjectUnit.findByIdAndUpdate(projectUnitId, {
        $set: {
          status:
            bookingStatus === "Sold"
              ? "Sold"
              : bookingStatus === "Hold"
                ? "Hold"
                : "Booked",
          bookedByClientId: new mongoose.Types.ObjectId(clientId),
          bookingDate: new Date(),
        },
      });
      if (projectId) {
        await recalculateProjectCounters(projectId);
      }
    } else if (itemType === "Property" && propertyId) {
      await Property.findByIdAndUpdate(propertyId, {
        $set: {
          status:
            bookingStatus === "Sold"
              ? "Sold"
              : bookingStatus === "Hold"
                ? "Hold"
                : "Booked",
        },
      });
    }

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: adminId.toString(),
      },
      action: "create",
      entity: "Booking",
      entityId: newBooking._id.toString(),
      newValues: {
        bookingNumber,
        inventoryLabel,
        agreementValue,
        bookingStatus,
      },
      source: "api",
    });

    return jsonResponse(newBooking, 201);
  } catch (error: any) {
    console.error("POST /api/bookings error:", error);
    return errorResponse(error.message || "Failed to create booking", 500);
  }
}
