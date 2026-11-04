import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { MasterOption } from "../src/models/MasterOption";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

export const DEFAULT_MASTER_OPTIONS = [
  // ----------------------------------------------------
  // 1. PROPERTY TYPES
  // ----------------------------------------------------
  // Residential
  { category: "property_types", label: "Apartment / Flat", value: "apartment", displayOrder: 1 },
  { category: "property_types", label: "Independent House / Villa", value: "villa", displayOrder: 2 },
  { category: "property_types", label: "Penthouse", value: "penthouse", displayOrder: 3 },
  { category: "property_types", label: "Builder Floor", value: "builder_floor", displayOrder: 4 },
  { category: "property_types", label: "Studio Apartment", value: "studio_apartment", displayOrder: 5 },
  { category: "property_types", label: "Row House / Bungalow", value: "bungalow", displayOrder: 6 },
  // Commercial
  { category: "property_types", label: "Commercial Office", value: "commercial_office", displayOrder: 10 },
  { category: "property_types", label: "Retail Shop / Showroom", value: "retail_shop", displayOrder: 11 },
  { category: "property_types", label: "Warehouse / Godown", value: "warehouse", displayOrder: 12 },
  { category: "property_types", label: "Industrial Property", value: "industrial_property", displayOrder: 13 },
  { category: "property_types", label: "Co-working Space", value: "coworking_space", displayOrder: 14 },
  // Land
  { category: "property_types", label: "Residential Plot", value: "residential_plot", displayOrder: 20 },
  { category: "property_types", label: "Commercial Land", value: "commercial_land", displayOrder: 21 },
  { category: "property_types", label: "Agricultural Land / Farm", value: "agricultural_land", displayOrder: 22 },
  { category: "property_types", label: "NA Plot", value: "na_plot", displayOrder: 23 },
  // Special Investment
  { category: "property_types", label: "Pre-Leased Commercial", value: "pre_leased_commercial", displayOrder: 30 },
  { category: "property_types", label: "Income Generating Property", value: "income_generating_property", displayOrder: 31 },

  // ----------------------------------------------------
  // 2. TRANSACTION TYPES
  // ----------------------------------------------------
  { category: "transaction_types", label: "Sale", value: "sale", displayOrder: 1 },
  { category: "transaction_types", label: "Rent", value: "rent", displayOrder: 2 },
  { category: "transaction_types", label: "Lease", value: "lease", displayOrder: 3 },

  // ----------------------------------------------------
  // 3. PROPERTY STATUSES (with isUnpublishTrigger flag)
  // ----------------------------------------------------
  { category: "property_statuses", label: "Available", value: "available", metadata: { isUnpublishTrigger: false, color: "#10B981" }, displayOrder: 1 },
  { category: "property_statuses", label: "Hold", value: "hold", metadata: { isUnpublishTrigger: false, color: "#F59E0B" }, displayOrder: 2 },
  { category: "property_statuses", label: "Booked", value: "booked", metadata: { isUnpublishTrigger: false, color: "#3B82F6" }, displayOrder: 3 },
  { category: "property_statuses", label: "Sold", value: "sold", metadata: { isUnpublishTrigger: true, color: "#EF4444" }, displayOrder: 4 },
  { category: "property_statuses", label: "Rented", value: "rented", metadata: { isUnpublishTrigger: true, color: "#6366F1" }, displayOrder: 5 },
  { category: "property_statuses", label: "Leased", value: "leased", metadata: { isUnpublishTrigger: true, color: "#8B5CF6" }, displayOrder: 6 },
  { category: "property_statuses", label: "Blocked", value: "blocked", metadata: { isUnpublishTrigger: true, color: "#64748B" }, displayOrder: 7 },
  { category: "property_statuses", label: "Archived", value: "archived", metadata: { isUnpublishTrigger: true, color: "#94A3B8" }, displayOrder: 8 },

  // ----------------------------------------------------
  // 4. LEAD SOURCES
  // ----------------------------------------------------
  { category: "lead_sources", label: "Website", value: "website", displayOrder: 1 },
  { category: "lead_sources", label: "Google Ads", value: "google_ads", displayOrder: 2 },
  { category: "lead_sources", label: "Meta / Facebook Ads", value: "meta_ads", displayOrder: 3 },
  { category: "lead_sources", label: "Instagram", value: "instagram", displayOrder: 4 },
  { category: "lead_sources", label: "WhatsApp Inquiry", value: "whatsapp", displayOrder: 5 },
  { category: "lead_sources", label: "Walk-in", value: "walk_in", displayOrder: 6 },
  { category: "lead_sources", label: "Referral", value: "referral", displayOrder: 7 },
  { category: "lead_sources", label: "Property Portal", value: "property_portal", displayOrder: 8 },

  // ----------------------------------------------------
  // 5. LEAD STATUSES
  // ----------------------------------------------------
  { category: "lead_statuses", label: "New", value: "new", displayOrder: 1 },
  { category: "lead_statuses", label: "Contacted", value: "contacted", displayOrder: 2 },
  { category: "lead_statuses", label: "Qualified", value: "qualified", displayOrder: 3 },
  { category: "lead_statuses", label: "Requirement Captured", value: "requirement_captured", displayOrder: 4 },
  { category: "lead_statuses", label: "Property Suggested", value: "property_suggested", displayOrder: 5 },
  { category: "lead_statuses", label: "Site Visit Planned", value: "site_visit_planned", displayOrder: 6 },
  { category: "lead_statuses", label: "Site Visit Completed", value: "site_visit_completed", displayOrder: 7 },
  { category: "lead_statuses", label: "Negotiation", value: "negotiation", displayOrder: 8 },
  { category: "lead_statuses", label: "Booking Done", value: "booking_done", displayOrder: 9 },
  { category: "lead_statuses", label: "Converted", value: "converted", displayOrder: 10 },
  { category: "lead_statuses", label: "Not Interested", value: "not_interested", displayOrder: 11 },
  { category: "lead_statuses", label: "Lost", value: "lost", displayOrder: 12 },

  // ----------------------------------------------------
  // 6. AMENITIES
  // ----------------------------------------------------
  { category: "amenities", label: "Swimming Pool", value: "swimming_pool", displayOrder: 1 },
  { category: "amenities", label: "Gymnasium", value: "gymnasium", displayOrder: 2 },
  { category: "amenities", label: "24/7 Power Backup", value: "power_backup", displayOrder: 3 },
  { category: "amenities", label: "Clubhouse", value: "clubhouse", displayOrder: 4 },
  { category: "amenities", label: "Children's Play Area", value: "children_play_area", displayOrder: 5 },
  { category: "amenities", label: "Covered Car Parking", value: "covered_parking", displayOrder: 6 },
  { category: "amenities", label: "CCTV & 24/7 Security", value: "security_cctv", displayOrder: 7 },
  { category: "amenities", label: "High Speed Lifts", value: "lifts", displayOrder: 8 },
  { category: "amenities", label: "Fire Safety System", value: "fire_safety", displayOrder: 9 },
  { category: "amenities", label: "Rainwater Harvesting", value: "rainwater_harvesting", displayOrder: 10 },

  // ----------------------------------------------------
  // 7. FURNISHING OPTIONS
  // ----------------------------------------------------
  { category: "furnishing_options", label: "Unfurnished", value: "unfurnished", displayOrder: 1 },
  { category: "furnishing_options", label: "Semi-Furnished", value: "semi_furnished", displayOrder: 2 },
  { category: "furnishing_options", label: "Fully Furnished", value: "fully_furnished", displayOrder: 3 },

  // ----------------------------------------------------
  // 8. LOCATIONS
  // ----------------------------------------------------
  { category: "locations", label: "Bengaluru", value: "bengaluru", displayOrder: 1 },
  { category: "locations", label: "Mumbai", value: "mumbai", displayOrder: 2 },
  { category: "locations", label: "Delhi NCR", value: "delhi_ncr", displayOrder: 3 },
  { category: "locations", label: "Hyderabad", value: "hyderabad", displayOrder: 4 },
  { category: "locations", label: "Pune", value: "pune", displayOrder: 5 },
];

export async function seedGlobalMasterDefaults() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB for Master Seeding.");

  let insertedCount = 0;
  let updatedCount = 0;

  for (const opt of DEFAULT_MASTER_OPTIONS) {
    const filter = {
      adminId: null, // Global default
      category: opt.category,
      value: opt.value,
    };

    const update = {
      $set: {
        label: opt.label,
        displayOrder: opt.displayOrder,
        metadata: (opt as any).metadata || {},
        isSystemDefault: true,
        isActive: true,
      },
    };

    const res = await MasterOption.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    if (res.createdAt.getTime() === res.updatedAt.getTime()) {
      insertedCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`Global Masters Seeded: ${insertedCount} inserted, ${updatedCount} updated.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  seedGlobalMasterDefaults()
    .then(() => {
      console.log("Master Seed Script Finished.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Master Seed Script Failed:", err);
      process.exit(1);
    });
}

