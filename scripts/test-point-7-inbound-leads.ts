import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongodb/db";
import { User } from "../src/models/User";
import { Owner } from "../src/models/Owner";
import { Property } from "../src/models/Property";
import { Project } from "../src/models/Project";
import { Lead } from "../src/models/Lead";
import { PublicInquiry } from "../src/models/PublicInquiry";
import { POST as postInquiryHandler } from "../src/app/api/public/inquiries/route";
import { ingestWebsiteInquiry, getSsrPublicInquiries } from "../src/services/leadIngestionService";
import { NextRequest } from "next/server";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function recordResult(name: string, passed: boolean, details?: any, error?: string) {
  results.push({ name, passed, details, error });
  if (passed) {
    console.log(`[PASS] ${name}${details ? ` - ${details}` : ""}`);
  } else {
    console.error(`[FAIL] ${name} - Error: ${error}`);
  }
}

async function runPoint7Tests() {
  console.log("--------------------------------------------------");
  console.log("STARTING POINT 7: INBOUND LEAD INGESTION & DEDUPLICATION TEST SUITE (WITH SSR)");
  console.log("--------------------------------------------------");

  try {
    await connectToDatabase();

    // 1. Setup Mock Admin & Test Inventory
    const adminUser = await User.findOneAndUpdate(
      { email: "admin.point7@example.com" },
      {
        email: "admin.point7@example.com",
        name: "Point7 Agency Admin",
        role: "admin",
        password: "hashed_password",
        status: "active",
        mobile: "9199990007",
        joiningDate: new Date(),
      },
      { upsert: true, new: true }
    );

    const testOwner = await Owner.findOneAndUpdate(
      { mobile: "9876543270" },
      {
        adminId: adminUser._id,
        ownerId: "OWN-2026-7777",
        name: "Point7 Landlord",
        mobile: "9876543270",
        ownershipType: "Individual",
        preferredContactMethod: "Call",
        createdById: adminUser._id,
      },
      { upsert: true, new: true }
    );

    // Clean prior test records
    await Lead.deleteMany({ adminId: adminUser._id });
    await PublicInquiry.deleteMany({ adminId: adminUser._id });
    await Property.deleteMany({ adminId: adminUser._id });
    await Project.deleteMany({ adminId: adminUser._id });

    const sampleProperty = await Property.create({
      adminId: adminUser._id,
      propertyId: "PROP-2026-7001",
      title: "Greenfield Villa Residency",
      propertyCategory: "Residential",
      propertyType: "villa",
      transactionType: "Sale",
      listingType: "Direct",
      status: "Available",
      ownerId: testOwner._id,
      pricing: { price: 25000000, isNegotiable: false },
      areaDetails: { carpetArea: 2500, areaUnit: "Sq. Ft." },
      location: { address: "Koramangala 4th Block", city: "Bengaluru" },
      publishing: { publishOnWebsite: true, featuredProperty: true, seo: { slug: "greenfield-villa-residency" } },
      createdById: adminUser._id,
    });

    const sampleProject = await Project.create({
      adminId: adminUser._id,
      projectId: "PRJ-2026-7001",
      name: "Cyber Heights Commercial Center",
      developerName: "Prestige Commercials",
      projectType: "Commercial",
      location: { address: "Electronic City Phase 1", city: "Bengaluru" },
      constructionStatus: "Ready to Move",
      totalUnits: 50,
      availableUnits: 15,
      bookedUnits: 20,
      soldUnits: 15,
      isPublishedOnWebsite: true,
      featuredOnWebsite: true,
      createdById: adminUser._id,
    });

    // =========================================================================
    // TC-CMS-02: New Visitor Property Inquiry Ingestion (Website -> CRM Lead)
    // =========================================================================
    const req1 = new NextRequest("http://localhost:3000/api/public/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        propertyId: sampleProperty._id.toString(),
        inquiryType: "Schedule_Visit",
        name: "Arjun Verma",
        phone: "9876543210",
        email: "arjun.verma@example.com",
        preferredDateTime: new Date(Date.now() + 86400000).toISOString(),
        message: "Interested in weekend visit to Greenfield Villa.",
      }),
    });

    const res1 = await postInquiryHandler(req1);
    const data1 = await res1.json();

    const leadInCrm1 = await Lead.findOne({
      adminId: adminUser._id,
      clientPhone: "9876543210",
    });

    const leadCreatedSuccessfully =
      res1.status === 201 &&
      data1.success === true &&
      data1.data.status === "Converted_To_Lead" &&
      data1.data.isNewLead === true &&
      leadInCrm1 !== null &&
      leadInCrm1.source === "Website" &&
      leadInCrm1.clientName === "Arjun Verma" &&
      leadInCrm1.activityTimeline?.length === 1;

    recordResult(
      "TC-CMS-02: New Visitor Property Inquiry Ingestion (Created Fresh Lead)",
      leadCreatedSuccessfully,
      `New Lead created in CRM (Lead ID: ${leadInCrm1?._id}, Source: '${leadInCrm1?.source}')`
    );

    // =========================================================================
    // TC-CMS-03: Inbound Lead Deduplication (Same Mobile Number)
    // =========================================================================
    // Arjun Verma now submits another inquiry for a DIFFERENT project
    const req2 = new NextRequest("http://localhost:3000/api/public/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: sampleProject._id.toString(),
        inquiryType: "Requirement",
        name: "Arjun Verma",
        phone: "9876543210", // SAME PHONE NUMBER
        email: "arjun.verma@example.com",
        message: "Also looking for commercial office space options in Cyber Heights.",
      }),
    });

    const res2 = await postInquiryHandler(req2);
    const data2 = await res2.json();

    // Check count of leads in CRM with this phone number (MUST BE EXACTLY 1)
    const totalMatchingLeads = await Lead.countDocuments({
      adminId: adminUser._id,
      clientPhone: "9876543210",
    });

    const updatedLead = await Lead.findOne({
      adminId: adminUser._id,
      clientPhone: "9876543210",
    });

    const deduplicationWorked =
      res2.status === 201 &&
      data2.success === true &&
      data2.data.status === "Appended_To_Existing_Lead" &&
      data2.data.isNewLead === false &&
      totalMatchingLeads === 1 &&
      updatedLead?.activityTimeline?.length === 2;

    recordResult(
      "TC-CMS-03: Inbound Lead Deduplication Engine (Zero Duplicate Leads)",
      deduplicationWorked,
      `Zero duplicate leads generated. Ingestion appended event to existing lead timeline (Total events: ${updatedLead?.activityTimeline?.length})`
    );

    // =========================================================================
    // TC-CMS-04: Multi-Tenant Lead Isolation
    // =========================================================================
    // Another agency admin receives inquiry from same phone number
    const adminUserB = await User.findOneAndUpdate(
      { email: "admin.point7b@example.com" },
      {
        email: "admin.point7b@example.com",
        name: "Point7 Agency B Admin",
        role: "admin",
        password: "hashed_password",
        status: "active",
        mobile: "9199990008",
        joiningDate: new Date(),
      },
      { upsert: true, new: true }
    );

    const resultTenantB = await ingestWebsiteInquiry({
      adminId: adminUserB._id.toString(),
      inquiryType: "General",
      name: "Arjun Verma",
      phone: "9876543210", // Same number, but different agency tenant
      message: "Looking for independent house in Koramangala.",
    });

    const leadTenantB = await Lead.findOne({
      adminId: adminUserB._id,
      clientPhone: "9876543210",
    });

    const tenantIsolationOk =
      resultTenantB.isNewLead === true &&
      leadTenantB !== null &&
      leadTenantB.adminId.toString() === adminUserB._id.toString();

    recordResult(
      "TC-CMS-04: Multi-Tenant Lead Isolation (Cross-Agency Boundary)",
      tenantIsolationOk,
      "Phone deduplication respects strict organization boundaries (adminId scoping)."
    );

    // =========================================================================
    // TC-CMS-05: SSR getSsrPublicInquiries() Feed Verification
    // =========================================================================
    const ssrStart = Date.now();
    const feedA = await getSsrPublicInquiries(adminUser._id.toString(), 1, 10);
    const ssrTime = Date.now() - ssrStart;

    const ssrFeedOk =
      feedA.inquiries.length === 2 &&
      feedA.pagination.total === 2 &&
      feedA.inquiries[0].phone === "9876543210" &&
      feedA.inquiries[0].crmLead !== null &&
      ssrTime < 500;

    recordResult(
      "TC-CMS-05: SSR getSsrPublicInquiries() Dashboard Feed Performance",
      ssrFeedOk,
      `Pre-rendered 2 inquiries with linked CRM Leads in ${ssrTime}ms on the server.`
    );

    // Cleanup
    await Lead.deleteMany({ adminId: { $in: [adminUser._id, adminUserB._id] } });
    await PublicInquiry.deleteMany({ adminId: { $in: [adminUser._id, adminUserB._id] } });
    await Property.deleteMany({ adminId: adminUser._id });
    await Project.deleteMany({ adminId: adminUser._id });
    await Owner.deleteOne({ _id: testOwner._id });
    await User.deleteMany({ _id: { $in: [adminUser._id, adminUserB._id] } });
  } catch (error: any) {
    console.error("Critical Test Execution Error:", error);
    recordResult("Critical Point 7 Test Error", false, undefined, error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  // Summary
  console.log("\n==================================================");
  console.log("POINT 7 TEST SUITE SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Point 7 Tests Run : ${total}`);
  console.log(`Tests Passed            : ${passed}`);
  console.log(`Tests Failed            : ${failed}`);

  if (failed === 0) {
    console.log("\nALL POINT 7 TESTS PASSED SUCCESSFULLY! (100% SUCCESS)\n");
    process.exit(0);
  } else {
    console.error("\nSOME POINT 7 TESTS FAILED.\n");
    process.exit(1);
  }
}

runPoint7Tests();

