import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { MasterOption } from "../src/models/MasterOption";
import { User } from "../src/models/User";
import { Role } from "../src/models/Role";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

interface TestResult {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: TestResult[] = [];

function recordTest(
  id: string,
  name: string,
  status: "PASS" | "FAIL",
  details: string,
) {
  results.push({ id, name, status, details });
  console.log(`[${status}] ${id}: ${name} - ${details}`);
}

async function runPoint2Tests() {
  console.log("--------------------------------------------------");
  console.log("STARTING POINT 2: MASTER SETTINGS TEST SUITE");
  console.log("--------------------------------------------------");

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI not set.");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB for Point 2 validation.\n");

  const orgAdminAId = new Types.ObjectId();
  const orgAdminBId = new Types.ObjectId();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Global Seed Completeness
    // -------------------------------------------------------------------------
    try {
      const globalPropertyTypes = await MasterOption.find({
        adminId: null,
        category: "property_types",
        isActive: true,
      });

      const requiredTypes = [
        "apartment",
        "villa",
        "penthouse",
        "commercial_office",
        "retail_shop",
        "residential_plot",
        "pre_leased_commercial",
      ];
      const missing = requiredTypes.filter(
        (t) => !globalPropertyTypes.some((opt) => opt.value === t),
      );

      if (missing.length > 0) {
        throw new Error(`Missing expected global types: ${missing.join(", ")}`);
      }

      recordTest(
        "TC-P2-01",
        "Global Default Master Options Seed Check",
        "PASS",
        `Verified global catalog contains all required core property types (Found ${globalPropertyTypes.length} total).`,
      );
    } catch (err: any) {
      recordTest(
        "TC-P2-01",
        "Global Default Master Options Seed Check",
        "FAIL",
        err.message,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 2: Status with Unpublish Trigger Check
    // -------------------------------------------------------------------------
    try {
      const unpublishStatuses = await MasterOption.find({
        adminId: null,
        category: "property_statuses",
        "metadata.isUnpublishTrigger": true,
      });

      const values = unpublishStatuses.map((s) => s.value);
      const expectedUnpublish = [
        "sold",
        "rented",
        "leased",
        "blocked",
        "archived",
      ];
      const missing = expectedUnpublish.filter((s) => !values.includes(s));

      if (missing.length > 0) {
        throw new Error(
          `Missing unpublish trigger flags on: ${missing.join(", ")}`,
        );
      }

      recordTest(
        "TC-P2-02",
        "Property Status Unpublish Triggers",
        "PASS",
        `Confirmed auto-unpublish triggers correctly set on: ${values.join(", ")}`,
      );
    } catch (err: any) {
      recordTest(
        "TC-P2-02",
        "Property Status Unpublish Triggers",
        "FAIL",
        err.message,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 3: Multi-Tenant Master Creation & Isolation
    // -------------------------------------------------------------------------
    let customOptionAdminA: any = null;
    try {
      customOptionAdminA = await MasterOption.create({
        adminId: orgAdminAId,
        category: "amenities",
        label: "Rooftop Observatory",
        value: "rooftop_observatory",
        displayOrder: 99,
        isSystemDefault: false,
        isActive: true,
      });

      // Admin A queries amenities: Should get global + Rooftop Observatory
      const adminAQuery = await MasterOption.find({
        category: "amenities",
        $or: [{ adminId: null }, { adminId: orgAdminAId }],
        isActive: true,
      });

      const adminAHasIt = adminAQuery.some(
        (a) => a.value === "rooftop_observatory",
      );

      // Admin B queries amenities: Should NOT see Admin A's Rooftop Observatory
      const adminBQuery = await MasterOption.find({
        category: "amenities",
        $or: [{ adminId: null }, { adminId: orgAdminBId }],
        isActive: true,
      });

      const adminBHasIt = adminBQuery.some(
        (a) => a.value === "rooftop_observatory",
      );

      if (!adminAHasIt) {
        throw new Error("Admin A could not see their own custom amenity.");
      }
      if (adminBHasIt) {
        throw new Error("Admin B leaked custom amenity belonging to Admin A!");
      }

      recordTest(
        "TC-P2-03",
        "Multi-Tenant Custom Master Isolation",
        "PASS",
        "Admin A created custom option; visible to Admin A and strictly hidden from Admin B.",
      );
    } catch (err: any) {
      recordTest(
        "TC-P2-03",
        "Multi-Tenant Custom Master Isolation",
        "FAIL",
        err.message,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 4: Duplicate Value Rejection within Tenant
    // -------------------------------------------------------------------------
    try {
      let duplicateCaught = false;
      try {
        await MasterOption.create({
          adminId: orgAdminAId,
          category: "amenities",
          label: "Duplicate Observatory",
          value: "rooftop_observatory", // Same slug as above
          displayOrder: 100,
          isSystemDefault: false,
          isActive: true,
        });
      } catch (err: any) {
        if (err.code === 11000) {
          duplicateCaught = true;
        }
      }

      if (!duplicateCaught) {
        throw new Error(
          "Database allowed duplicate slug within the same tenant scope!",
        );
      }

      recordTest(
        "TC-P2-04",
        "Unique Compound Index Enforcement",
        "PASS",
        "Successfully prevented duplicate slug within tenant's category scope.",
      );
    } catch (err: any) {
      recordTest(
        "TC-P2-04",
        "Unique Compound Index Enforcement",
        "FAIL",
        err.message,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 5: System Default Deletion Guard
    // -------------------------------------------------------------------------
    try {
      const apartmentOption = await MasterOption.findOne({
        adminId: null,
        value: "apartment",
        isSystemDefault: true,
      });

      if (!apartmentOption) {
        throw new Error("System default 'apartment' option not found.");
      }

      if (!apartmentOption.isSystemDefault) {
        throw new Error("Expected isSystemDefault to be true on core default.");
      }

      recordTest(
        "TC-P2-05",
        "System Default Protection Flag",
        "PASS",
        "Verified system defaults have isSystemDefault=true, guarding against unauthorized deletion.",
      );
    } catch (err: any) {
      recordTest(
        "TC-P2-05",
        "System Default Protection Flag",
        "FAIL",
        err.message,
      );
    }

    // Clean up test option created for Admin A
    if (customOptionAdminA?._id) {
      await MasterOption.findByIdAndDelete(customOptionAdminA._id);
    }
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  console.log("\n==================================================");
  console.log("POINT 2 TEST SUITE SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Tests Run : ${total}`);
  console.log(`Tests Passed    : ${passed}`);
  console.log(`Tests Failed    : ${failed}`);

  if (failed > 0) {
    console.error("\nSome Point 2 tests failed!");
    process.exit(1);
  } else {
    console.log("\nALL POINT 2 TESTS PASSED SUCCESSFULLY! Ready for Point 3.");
    process.exit(0);
  }
}

runPoint2Tests().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
