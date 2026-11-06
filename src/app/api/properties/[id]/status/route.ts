import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/properties/[id]/status
 * Dedicated endpoint to update Property Status (Available, Hold, Booked, Sold, Rented, Leased)
 * with buyer client allocation (existing or new), notes, and automatic Client Track Record generation
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid property ID", 400);
    }

    await connectToDatabase();

    const body = await req.json();
    const { status, clientId, notes } = body;

    if (!status) {
      return errorResponse("Status is required", 400);
    }

    const property = await Property.findById(id);
    if (!property) {
      return errorResponse("Property not found", 404);
    }

    const oldStatus = property.status;
    property.status = status;
    await property.save();

    // Automatically create or update Booking & Client Track Record entry when marked as Booked or Sold or Hold with a client
    if (
      (status === "Booked" ||
        status === "Sold" ||
        status === "Hold" ||
        status === "Rented" ||
        status === "Leased") &&
      clientId
    ) {
      try {
        const invLabel = `${property.propertyId} - ${property.title} (${property.propertyCategory} / ${property.propertyType})`;

        const existingBooking = await Booking.findOne({
          propertyId: property._id,
        });

        if (existingBooking) {
          existingBooking.bookingStatus =
            status === "Sold" ? "Sold" : status === "Hold" ? "Hold" : "Booked";
          existingBooking.clientId = new mongoose.Types.ObjectId(clientId);
          if (notes) existingBooking.notes = notes;
          await existingBooking.save();
        } else {
          const datePrefix = new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "");
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const bkgNumber = `BKG-${datePrefix}-${randomSuffix}`;

          await Booking.create({
            adminId: property.adminId,
            bookingNumber: bkgNumber,
            clientId: new mongoose.Types.ObjectId(clientId),
            itemType: "Property",
            propertyId: property._id,
            inventoryLabel: invLabel,
            bookingStatus:
              status === "Sold"
                ? "Sold"
                : status === "Hold"
                  ? "Hold"
                  : "Booked",
            agreementValue:
              property.pricing?.price || property.pricing?.monthlyRent || 0,
            payments: [],
            documents: [],
            notes: notes || `Directly allocated from Properties Inventory.`,
            createdById: authContext.user._id,
          });
        }
      } catch (bookingErr) {
        console.error("Auto booking creation for property failed:", bookingErr);
      }
    } else if (status === "Available") {
      try {
        await Booking.findOneAndUpdate(
          { propertyId: property._id },
          { $set: { bookingStatus: "Cancelled" } },
        );
      } catch (err) {
        console.error("Auto cancel property booking failed:", err);
      }
    }

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: property.adminId.toString(),
      },
      action: "status_change",
      entity: "Property",
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status, clientId, notes },
      source: "api",
    });

    return jsonResponse(property);
  } catch (error: any) {
    console.error("PATCH /api/properties/[id]/status error:", error);
    return errorResponse(
      error.message || "Failed to update property status",
      500,
    );
  }
}
