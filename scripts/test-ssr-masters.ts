import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { getSsrMasterOptions } from "../src/services/masterService";
import { MasterOption } from "../src/models/MasterOption";
import { User } from "../src/models/User";
import { Role } from "../src/models/Role";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

interface SsrTestResult {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: SsrTestResult[] = [];

function recordTest(id: string, name: string, status: "PASS" | "FAIL", details: string) {
  results.push({ id, name, status, details });
  console.log(`[${status}] ${id}: ${name} - ${details}`);
}

async function runSsrTests() {
  console.log("--------------------------------------------------");
  console.log("STARTING SSR (SERVER-SIDE RENDER) DATA LOADER TEST SUITE");
  console.log("--------------------------------------------------");

  if (!MONGODB_URI) throw new Error("MONGODB_URI missing");
  await mongoose.connect(MONGODB_URI);

  const orgAdminAId = new Types.ObjectId();
  const orgAdminBId = new Types.ObjectId();
  let customOptionAdminA: any = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: SSR Pre-Rendering Global Defaults
    // -------------------------------------------------------------------------
    try {
      const ssrOptions = await getSsrMasterOptions({
        userId: orgAdminAId.toString(),
        roleSlug: "admin",
        category: "property_types",
        includeInactive: true,
      });

      if (!ssrOptions || ssrOptions.length === 0) {
        throw new Error("SSR loader returned empty options for property_types");
      }

      const hasApartment = ssrOptions.some((o) => o.value === "apartment");
      const hasVilla = ssrOptions.some((o) => o.value === "villa");

      if (!hasApartment || !hasVilla) {
        throw new Error("SSR pre-rendered options missing core defaults");
      }

      recordTest(
        "TC-SSR-01",
        "SSR Data Preloading (Global Defaults)",
        "PASS",
        `SSR loader returned ${ssrOptions.length} pre-rendered options directly from DB without HTTP latency.`
      );
    } catch (err: any) {
      recordTest("TC-SSR-01", "SSR Data Preloading (Global Defaults)", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: SSR Multi-Tenant Custom Option Merging
    // -------------------------------------------------------------------------
    try {
      customOptionAdminA = await MasterOption.create({
        adminId: orgAdminAId,
        category: "amenities",
        label: "SSR Private Marina",
        value: "ssr_private_marina",
        displayOrder: 99,
        isSystemDefault: false,
        isActive: true,
      });

      // Admin A SSR Load
      const adminASsr = await getSsrMasterOptions({
        userId: orgAdminAId.toString(),
        roleSlug: "admin",
        category: "amenities",
      });

      const adminAHasIt = adminASsr.some((o) => o.value === "ssr_private_marina");

      // Admin B SSR Load
      const adminBSsr = await getSsrMasterOptions({
        userId: orgAdminBId.toString(),
        roleSlug: "admin",
        category: "amenities",
      });

      const adminBHasIt = adminBSsr.some((o) => o.value === "ssr_private_marina");

      if (!adminAHasIt) {
        throw new Error("Admin A SSR could not see their custom amenity");
      }
      if (adminBHasIt) {
        throw new Error("Admin B SSR leaked Admin A's custom amenity!");
      }

      recordTest(
        "TC-SSR-02",
        "SSR Tenant Data Isolation & Merging",
        "PASS",
        "SSR loader merged custom options for Admin A while keeping Admin B cleanly isolated."
      );
    } catch (err: any) {
      recordTest("TC-SSR-02", "SSR Tenant Data Isolation & Merging", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: SSR Sub-Role Scoping via Parent Admin
    // -------------------------------------------------------------------------
    let salesUser: any = null;
    try {
      const salesRole = await Role.findOne({ slug: "sales_executive" });
      const timestamp = Date.now();
      salesUser = await User.create({
        name: "Sales User SSR Test",
        email: `ssr_sales_${timestamp}@example.com`,
        mobile: `95${timestamp.toString().slice(-8)}`,
        joiningDate: new Date(),
        passwordHash: "hash123",
        roleId: salesRole?._id,
        role: salesRole,
        parentAdminId: orgAdminAId, // Belongs to Admin A
        status: "active",
      });

      const subRoleSsr = await getSsrMasterOptions({
        userId: salesUser._id.toString(),
        roleSlug: "sales_executive",
        category: "amenities",
      });

      const subRoleHasAdminAOption = subRoleSsr.some((o) => o.value === "ssr_private_marina");

      if (!subRoleHasAdminAOption) {
        throw new Error("Sub-role did not inherit parent admin's custom option during SSR");
      }

      recordTest(
        "TC-SSR-03",
        "SSR Sub-Role Parent Admin Scoping",
        "PASS",
        "Sub-role successfully inherited organization custom options via parentAdminId in SSR."
      );
    } catch (err: any) {
      recordTest("TC-SSR-03", "SSR Sub-Role Parent Admin Scoping", "FAIL", err.message);
    } finally {
      if (salesUser?._id) await User.findByIdAndDelete(salesUser._id);
    }

    // Cleanup custom option
    if (customOptionAdminA?._id) {
      await MasterOption.findByIdAndDelete(customOptionAdminA._id);
    }
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  console.log("\n==================================================");
  console.log("SSR TEST SUITE SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total SSR Tests Run : ${total}`);
  console.log(`Tests Passed        : ${passed}`);
  console.log(`Tests Failed        : ${failed}`);

  if (failed > 0) {
    console.error("\nSome SSR tests failed!");
    process.exit(1);
  } else {
    console.log("\nALL SSR TESTS PASSED SUCCESSFULLY! (100% SUCCESS)");
    process.exit(0);
  }
}

runSsrTests().catch((err) => {
  console.error("SSR test execution failed:", err);
  process.exit(1);
});

