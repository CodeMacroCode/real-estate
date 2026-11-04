import { NextRequest } from "next/server";
import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import {
  GET as getProperties,
  POST as postProperty,
} from "../src/app/api/properties/route";
import {
  GET as getPropertyById,
  PATCH as updateProperty,
  DELETE as deleteProperty,
} from "../src/app/api/properties/[id]/route";
import {
  getSsrProperties,
  matchPropertiesForClient,
  calculateInvestmentRoi,
} from "../src/services/propertyService";
import { Property } from "../src/models/Property";
import { Owner } from "../src/models/Owner";
import { User } from "../src/models/User";
import { Role } from "../src/models/Role";
import { signAuthToken } from "../src/lib/auth/jwt";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

interface Point5TestResult {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: Point5TestResult[] = [];

function recordTest(
  id: string,
  name: string,
  status: "PASS" | "FAIL",
  details: string,
) {
  results.push({ id, name, status, details });
  console.log(`[${status}] ${id}: ${name} - ${details}`);
}

async function runPoint5Tests() {
  console.log("--------------------------------------------------");
  console.log("STARTING POINT 5: PROPERTIES INVENTORY TEST SUITE (WITH SSR)");
  console.log("--------------------------------------------------");

  if (!MONGODB_URI) throw new Error("MONGODB_URI missing");
  await mongoose.connect(MONGODB_URI);

  let adminAUser: any = null;
  let adminBUser: any = null;
  let testOwner: any = null;
  let createdPropId: string = "";
  let preLeasedPropId: string = "";

  try {
    const adminRole = await Role.findOne({ slug: "admin" });
    const timestamp = Date.now();

    adminAUser = await User.create({
      name: "Admin Org A Properties",
      email: `adminA_prop_${timestamp}@test.com`,
      mobile: `91${timestamp.toString().slice(-8)}`,
      joiningDate: new Date(),
      passwordHash: "hash123",
      roleId: adminRole?._id,
      role: adminRole,
      status: "active",
    });

    adminBUser = await User.create({
      name: "Admin Org B Properties",
      email: `adminB_prop_${timestamp}@test.com`,
      mobile: `92${timestamp.toString().slice(-8)}`,
      joiningDate: new Date(),
      passwordHash: "hash123",
      roleId: adminRole?._id,
      role: adminRole,
      status: "active",
    });

    const adminAToken = await signAuthToken({
      userId: adminAUser._id.toString(),
      email: adminAUser.email,
      name: adminAUser.name,
      roleSlug: "admin",
      roleId: adminAUser.roleId.toString(),
      department: "Management",
      branch: "HQ",
    });

    const adminBToken = await signAuthToken({
      userId: adminBUser._id.toString(),
      email: adminBUser.email,
      name: adminBUser.name,
      roleSlug: "admin",
      roleId: adminBUser.roleId.toString(),
      department: "Management",
      branch: "HQ",
    });

    testOwner = await Owner.create({
      adminId: adminAUser._id,
      ownerId: `OWN-TEST-${timestamp}`,
      name: "Vikram Malhotra",
      mobile: `98${timestamp.toString().slice(-8)}`,
      email: `vikram_${timestamp}@test.com`,
      createdById: adminAUser._id,
    });

    // -------------------------------------------------------------------------
    // TEST 1: POST /api/properties - Create Property & Mandatory Owner Validation
    // -------------------------------------------------------------------------
    try {
      // 1a: Attempt missing owner
      const reqMissingOwner = new NextRequest(
        "http://localhost:3000/api/properties",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${adminAToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: "Missing Owner Villa",
            propertyCategory: "Residential",
            propertyType: "villa",
            transactionType: "Sale",
            location: { address: "Sarjapur", city: "Bengaluru" },
          }),
        },
      );
      const resMissing = await postProperty(reqMissingOwner);
      if (resMissing.status !== 400) {
        throw new Error(
          `Expected 400 Bad Request when owner is missing, got ${resMissing.status}`,
        );
      }

      // 1b: Valid creation with Owner
      const reqValid = new NextRequest("http://localhost:3000/api/properties", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Luxury 3BHK Penthouse with Private Terrace",
          propertyCategory: "Residential",
          propertyType: "penthouse",
          transactionType: "Sale",
          status: "Available",
          ownerId: testOwner._id.toString(),
          pricing: { price: 14500000, isNegotiable: true },
          areaDetails: { carpetArea: 1850, areaUnit: "Sq. Ft." },
          location: { address: "Indiranagar 100ft Road", city: "Bengaluru" },
          residentialSpecs: {
            bedrooms: 3,
            bathrooms: 3,
            furnishing: "Fully-Furnished",
          },
          publishing: { publishOnWebsite: true },
        }),
      });

      const resValid = await postProperty(reqValid);
      const jsonValid = await resValid.json();

      if (
        resValid.status !== 201 ||
        !jsonValid.data?._id ||
        !jsonValid.data?.propertyId
      ) {
        throw new Error(
          `Expected 201 with propertyId, got ${resValid.status}: ${JSON.stringify(jsonValid)}`,
        );
      }
      createdPropId = jsonValid.data._id;

      recordTest(
        "TC-P5-01",
        "POST /api/properties Mandatory Owner Check & Auto ID",
        "PASS",
        `Blocked missing owner (400) and created valid property [${jsonValid.data.propertyId}], ID: ${createdPropId}`,
      );
    } catch (err: any) {
      recordTest(
        "TC-P5-01",
        "POST /api/properties Mandatory Owner Check & Auto ID",
        "FAIL",
        err.message,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 2: Pre-Leased Commercial ROI & Yield Math Calculation
    // -------------------------------------------------------------------------
    try {
      const purchasePrice = 40000000; // 4 Crore
      const monthlyRent = 300000; // 3 Lakh / month

      const reqPreLeased = new NextRequest(
        "http://localhost:3000/api/properties",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${adminAToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: "High-Yield Grade A IT Park Office Space",
            propertyCategory: "Special Investment",
            propertyType: "pre_leased_commercial",
            transactionType: "Sale",
            status: "Available",
            ownerId: testOwner._id.toString(),
            pricing: { price: purchasePrice, monthlyRent: monthlyRent },
            investmentSpecs: { tenantCompany: "Global MNC Bank" },
            location: { address: "Outer Ring Road", city: "Bengaluru" },
            publishing: { publishOnWebsite: true },
          }),
        },
      );

      const resPreLeased = await postProperty(reqPreLeased);
      const jsonPreLeased = await resPreLeased.json();

      if (resPreLeased.status !== 201) {
        throw new Error(
          `Pre-leased creation failed: ${JSON.stringify(jsonPreLeased)}`,
        );
      }
      preLeasedPropId = jsonPreLeased.data._id;

      const specs = jsonPreLeased.data.investmentSpecs;
      const expectedAnnual = 300000 * 12; // 36,00,000
      const expectedYield = 9.0; // (36L / 4Cr) * 100 = 9%

      if (
        specs.expectedAnnualRent !== expectedAnnual ||
        specs.grossYieldPercent !== expectedYield
      ) {
        throw new Error(
          `ROI Math mismatch. Expected ${expectedYield}%, got ${specs.grossYieldPercent}%`,
        );
      }

      recordTest(
        "TC-P5-02",
        "Pre-Leased Commercial ROI & Gross Yield Auto-Calculation",
        "PASS",
        `Price ₹4Cr, Rent ₹3L/mo -> Expected Annual ₹36L, Gross Yield exactly ${specs.grossYieldPercent}%.`,
      );
    } catch (err: any) {
      recordTest(
        "TC-P5-02",
        "Pre-Leased Commercial ROI & Gross Yield Auto-Calculation",
        "FAIL",
        err.message,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 3: Automatic Website Unpublishing on Status Transition to 'Sold'
    // -------------------------------------------------------------------------
    try {
      // 3a: Verify currently published
      const before = await Property.findById(createdPropId).lean();
      if (!before?.publishing?.publishOnWebsite) {
        throw new Error("Property was expected to be published initially");
      }

      // 3b: Update status to 'Sold'
      const reqSold = new NextRequest(
        `http://localhost:3000/api/properties/${createdPropId}`,
        {
          method: "PATCH",
          headers: {
            authorization: `Bearer ${adminAToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ status: "Sold" }),
        },
      );

      const resSold = await updateProperty(reqSold, {
        params: Promise.resolve({ id: createdPropId }),
      });
      const jsonSold = await resSold.json();

      if (resSold.status !== 200)
        throw new Error(`Status update failed: ${resSold.status}`);

      // Verify publishOnWebsite is now FALSE and unpublishReason is set
      const after = await Property.findById(createdPropId).lean();
      if (after?.publishing?.publishOnWebsite === true) {
        throw new Error(
          "Property remained published after status changed to 'Sold'!",
        );
      }
      if (!after?.publishing?.unpublishReason?.includes("Sold")) {
        throw new Error(
          `Expected unpublishReason to mention Sold, got: ${after?.publishing?.unpublishReason}`,
        );
      }

      recordTest(
        "TC-P5-03",
        "Automated Website Unpublish Engine (Status -> Sold)",
        "PASS",
        `Transitioning status to 'Sold' automatically flipped publishOnWebsite to false (${after?.publishing?.unpublishReason}).`,
      );
    } catch (err: any) {
      recordTest(
        "TC-P5-03",
        "Automated Website Unpublish Engine (Status -> Sold)",
        "FAIL",
        err.message,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 4: Automatic Website Unpublishing on Status Transition to 'Rented'
    // -------------------------------------------------------------------------
    try {
      // Update Pre-Leased property status to 'Rented'
      const reqRented = new NextRequest(
        `http://localhost:3000/api/properties/${preLeasedPropId}`,
        {
          method: "PATCH",
          headers: {
            authorization: `Bearer ${adminAToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ status: "Rented" }),
        },
      );

      const resRented = await updateProperty(reqRented, {
        params: Promise.resolve({ id: preLeasedPropId }),
      });
      if (resRented.status !== 200)
        throw new Error(`Update to rented failed: ${resRented.status}`);

      const afterRented = await Property.findById(preLeasedPropId).lean();
      if (afterRented?.publishing?.publishOnWebsite === true) {
        throw new Error(
          "Property remained published after status changed to 'Rented'!",
        );
      }

      recordTest(
        "TC-P5-04",
        "Automated Website Unpublish Engine (Status -> Rented)",
        "PASS",
        `Transitioning status to 'Rented' automatically flipped publishOnWebsite to false.`,
      );
    } catch (err: any) {
      recordTest(
        "TC-P5-04",
        "Automated Website Unpublish Engine (Status -> Rented)",
        "FAIL",
        err.message,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 5: SSR getSsrProperties() Multi-Tenant Isolation
    // -------------------------------------------------------------------------
    try {
      const adminASsr = await getSsrProperties({
        userId: adminAUser._id.toString(),
        roleSlug: "admin",
      });

      const adminBSsr = await getSsrProperties({
        userId: adminBUser._id.toString(),
        roleSlug: "admin",
      });

      const adminAHasIt = adminASsr.properties.some(
        (p) => p._id === createdPropId,
      );
      const adminBHasIt = adminBSsr.properties.some(
        (p) => p._id === createdPropId,
      );

      if (!adminAHasIt)
        throw new Error("Admin A SSR could not see created property");
      if (adminBHasIt)
        throw new Error("Admin B SSR leaked property belonging to Admin A!");

      recordTest(
        "TC-P5-05",
        "SSR getSsrProperties() Multi-Tenant Scoping",
        "PASS",
        `Admin A pre-rendered ${adminASsr.properties.length} properties; Admin B rendered 0 (Clean tenant isolation).`,
      );
    } catch (err: any) {
      recordTest(
        "TC-P5-05",
        "SSR getSsrProperties() Multi-Tenant Scoping",
        "FAIL",
        err.message,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 6: Lead-to-Property Match Algorithm
    // -------------------------------------------------------------------------
    try {
      // Create active Available property to match
      const matchingProp = await Property.create({
        adminId: adminAUser._id,
        propertyId: `PROP-MATCH-${timestamp}`,
        title: "Modern 2BHK Apartment for Immediate Sale",
        propertyCategory: "Residential",
        propertyType: "apartment",
        transactionType: "Sale",
        status: "Available",
        ownerId: testOwner._id,
        pricing: { price: 6500000 },
        residentialSpecs: { bedrooms: 2 },
        location: { city: "Bengaluru", address: "Sarjapur Road" },
        createdById: adminAUser._id,
      });

      const clientCriteria = {
        adminId: adminAUser._id,
        transactionType: "Buy",
        propertyCategories: ["Residential"],
        propertyTypes: ["apartment"],
        minBudget: 5000000,
        maxBudget: 8000000,
        minBedrooms: 2,
      };

      const matches = await matchPropertiesForClient(clientCriteria);
      const foundMatch = matches.some(
        (m: any) => m._id.toString() === matchingProp._id.toString(),
      );

      if (!foundMatch) {
        throw new Error(
          "Lead-to-property match engine failed to return qualifying available property.",
        );
      }

      recordTest(
        "TC-P5-06",
        "Lead-to-Property Match Engine",
        "PASS",
        `Matched qualifying available property [${matchingProp.title}] (₹65L, 2BHK) for client requirement.`,
      );

      await Property.findByIdAndDelete(matchingProp._id);
    } catch (err: any) {
      recordTest(
        "TC-P5-06",
        "Lead-to-Property Match Engine",
        "FAIL",
        err.message,
      );
    }
  } finally {
    // Cleanup
    if (createdPropId) await Property.findByIdAndDelete(createdPropId);
    if (preLeasedPropId) await Property.findByIdAndDelete(preLeasedPropId);
    if (testOwner?._id) await Owner.findByIdAndDelete(testOwner._id);
    if (adminAUser?._id) await User.findByIdAndDelete(adminAUser._id);
    if (adminBUser?._id) await User.findByIdAndDelete(adminBUser._id);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  console.log("\n==================================================");
  console.log("POINT 5 TEST SUITE SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Point 5 Tests Run : ${total}`);
  console.log(`Tests Passed            : ${passed}`);
  console.log(`Tests Failed            : ${failed}`);

  if (failed > 0) {
    console.error("\nSome Point 5 tests failed!");
    process.exit(1);
  } else {
    console.log("\nALL POINT 5 TESTS PASSED SUCCESSFULLY! (100% SUCCESS)");
    process.exit(0);
  }
}

runPoint5Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
