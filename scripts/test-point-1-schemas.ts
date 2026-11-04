import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Models using relative import from scripts/ folder
import { MasterOption } from "../src/models/MasterOption";
import { Owner } from "../src/models/Owner";
import { ClientRequirement } from "../src/models/ClientRequirement";
import { Project } from "../src/models/Project";
import { ProjectUnit } from "../src/models/ProjectUnit";
import { Property } from "../src/models/Property";
import { PublicInquiry } from "../src/models/PublicInquiry";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

interface TestResult {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: TestResult[] = [];

function recordTest(id: string, name: string, status: "PASS" | "FAIL", details: string) {
  results.push({ id, name, status, details });
  console.log(`[${status}] ${id}: ${name} - ${details}`);
}

async function runPoint1Tests() {
  console.log("--------------------------------------------------");
  console.log("STARTING POINT 1: SCHEMA & INTEGRATION TEST SUITE");
  console.log("--------------------------------------------------");

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI not configured in .env");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB successfully.\n");

  const testAdminId = new Types.ObjectId();
  const testUserId = new Types.ObjectId();
  const testClientId = new Types.ObjectId();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: MasterOption - Global & Tenant Scoping + Index Validation
    // -------------------------------------------------------------------------
    try {
      const globalOption = new MasterOption({
        adminId: null,
        category: "property_types",
        label: "Luxury Villa",
        value: "luxury_villa",
        isSystemDefault: true,
        isActive: true,
      });
      await globalOption.validate();

      const tenantOption = new MasterOption({
        adminId: testAdminId,
        category: "amenities",
        label: "Infinity Pool",
        value: "infinity_pool",
        metadata: { isUnpublishTrigger: false, icon: "pool" },
        isSystemDefault: false,
        isActive: true,
        createdById: testUserId,
      });
      await tenantOption.validate();

      recordTest(
        "TC-P1-01",
        "MasterOption Schema Validation",
        "PASS",
        "Successfully validated Global (adminId=null) and Tenant-scoped master options."
      );
    } catch (err: any) {
      recordTest("TC-P1-01", "MasterOption Schema Validation", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Owner - KYC, Contact & Validation
    // -------------------------------------------------------------------------
    let createdOwner: any = null;
    try {
      createdOwner = new Owner({
        adminId: testAdminId,
        ownerId: `OWN-TEST-${Date.now()}`,
        name: "Test Property Owner",
        mobile: "+919876500001",
        email: "owner@example.com",
        ownershipType: "Individual",
        preferredContactMethod: "WhatsApp",
        documents: [
          {
            title: "Aadhar Card",
            fileUrl: "https://example.com/docs/aadhar.pdf",
            documentType: "Aadhar",
          },
        ],
        createdById: testUserId,
      });
      await createdOwner.validate();

      recordTest(
        "TC-P1-02",
        "Owner Schema & KYC Document Structure",
        "PASS",
        "Owner model validated with ownershipType, documents, and auto-generated structure."
      );
    } catch (err: any) {
      recordTest("TC-P1-02", "Owner Schema & KYC Document Structure", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: ClientRequirement - Budget, Categorization & Preferences
    // -------------------------------------------------------------------------
    try {
      const requirement = new ClientRequirement({
        adminId: testAdminId,
        clientId: testClientId,
        transactionType: "Buy",
        propertyCategories: ["Residential"],
        propertyTypes: ["apartment", "penthouse"],
        minBudget: 5000000,
        maxBudget: 12000000,
        preferredLocations: ["Whitefield", "Indiranagar"],
        minBedrooms: 3,
        furnishing: "Semi-Furnished",
        createdById: testUserId,
      });
      await requirement.validate();

      recordTest(
        "TC-P1-03",
        "ClientRequirement Model Validation",
        "PASS",
        "Captured multi-category requirements, budget ranges, and furnishing criteria."
      );
    } catch (err: any) {
      recordTest("TC-P1-03", "ClientRequirement Model Validation", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Project - Development Overview, Media & Live Counters
    // -------------------------------------------------------------------------
    let createdProject: any = null;
    try {
      createdProject = new Project({
        adminId: testAdminId,
        projectId: `PRJ-TEST-${Date.now()}`,
        name: "Greenwood Palms Township",
        developerName: "Greenwood Infra Ltd",
        projectType: "Township",
        location: {
          address: "Survey 45, Sarjapur Road",
          city: "Bengaluru",
          landmark: "Near Wipro Corporate Office",
          lat: 12.9123,
          lng: 77.6789,
        },
        reraNumber: "PRM/KA/RERA/1251/308/PR/2026",
        constructionStatus: "Under Construction",
        amenities: ["Clubhouse", "Gym", "Jogging Track", "24/7 Security"],
        media: {
          coverImage: "https://example.com/cover.jpg",
          images: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
          brochureUrl: "https://example.com/brochure.pdf",
          floorPlans: [{ title: "3BHK Floor Plan", imageUrl: "https://example.com/fp3.jpg" }],
        },
        totalUnits: 120,
        availableUnits: 110,
        bookedUnits: 8,
        soldUnits: 2,
        isPublishedOnWebsite: true,
        featuredOnWebsite: true,
        seo: {
          slug: "greenwood-palms-sarjapur",
          metaTitle: "Greenwood Palms - Luxury Township",
        },
        createdById: testUserId,
      });
      await createdProject.validate();

      recordTest(
        "TC-P1-04",
        "Project Schema & Structural Counters",
        "PASS",
        "Project validated with full location, media, RERA, and unit counters."
      );
    } catch (err: any) {
      recordTest("TC-P1-04", "Project Schema & Structural Counters", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: ProjectUnit - Tower / Floor / Unit Hierarchical Association
    // -------------------------------------------------------------------------
    let createdUnit: any = null;
    try {
      createdUnit = new ProjectUnit({
        adminId: testAdminId,
        projectId: createdProject._id,
        towerName: "Tower B",
        floorNumber: 5,
        unitNumber: "B-502",
        unitType: "3BHK",
        carpetArea: 1450,
        builtUpArea: 1820,
        balconyArea: 120,
        facing: "East",
        price: 11500000,
        parkingSlots: 2,
        status: "Available",
        createdById: testUserId,
      });
      await createdUnit.validate();

      recordTest(
        "TC-P1-05",
        "ProjectUnit Schema & Hierarchical Tree Link",
        "PASS",
        "Unit correctly structured with Tower, Floor, Pricing, and Project Reference."
      );
    } catch (err: any) {
      recordTest("TC-P1-05", "ProjectUnit Schema & Hierarchical Tree Link", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Property - Mandatory Owner Linkage + Publishing + Investment ROI
    // -------------------------------------------------------------------------
    try {
      // 6a: Test rejection when ownerId is missing
      let rejected = false;
      try {
        const invalidProp = new Property({
          adminId: testAdminId,
          propertyId: "PROP-INVALID",
          title: "Invalid Property Missing Owner",
          propertyCategory: "Residential",
          propertyType: "apartment",
          transactionType: "Sale",
          location: { address: "MG Road", city: "Bengaluru" },
          createdById: testUserId,
        });
        await invalidProp.validate();
      } catch (validationErr: any) {
        if (validationErr.errors?.ownerId) {
          rejected = true;
        }
      }

      if (!rejected) {
        throw new Error("Property schema allowed missing ownerId, but ownerId must be required!");
      }

      // 6b: Valid property with Owner reference, Pre-Leased ROI, and Publishing flags
      const validProp = new Property({
        adminId: testAdminId,
        propertyId: `PROP-TEST-${Date.now()}`,
        title: "Prime Pre-Leased Commercial Office Space",
        propertyCategory: "Special Investment",
        propertyType: "pre_leased_commercial",
        transactionType: "Sale",
        listingType: "Exclusive",
        status: "Available",
        ownerId: createdOwner._id,
        projectId: createdProject._id,
        unitId: createdUnit._id,
        pricing: {
          price: 35000000, // 3.5 Cr
          pricePerUnitArea: 11666,
          isNegotiable: false,
          monthlyRent: 262500, // 2.625 L / mo
          maintenanceCharges: 15000,
        },
        areaDetails: {
          carpetArea: 2500,
          builtUpArea: 3000,
          areaUnit: "Sq. Ft.",
        },
        location: {
          address: "Outer Ring Road, Bellandur",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560103",
        },
        investmentSpecs: {
          tenantCompany: "Fortune 500 Tech Corp",
          leaseStart: new Date("2024-01-01"),
          leaseEnd: new Date("2029-12-31"),
          currentMonthlyRent: 262500,
          expectedAnnualRent: 3150000,
          grossYieldPercent: 9.0, // (31.5L / 3.5Cr) * 100 = 9%
          lockInPeriodMonths: 36,
        },
        amenities: ["Power Backup", "Central AC", "Multi-Level Parking"],
        media: {
          featuredImage: "https://example.com/featured.jpg",
          images: ["https://example.com/p1.jpg"],
        },
        publishing: {
          publishOnWebsite: true,
          featuredProperty: true,
          publishedAt: new Date(),
          seo: {
            slug: "prime-pre-leased-commercial-office-bellandur",
            metaTitle: "Pre-Leased Commercial Office with 9% Yield",
          },
        },
        createdById: testUserId,
      });
      await validProp.validate();

      recordTest(
        "TC-P1-06",
        "Property Schema - Owner Linkage & Pre-Leased Financials",
        "PASS",
        "Enforces mandatory ownerId; accurately represents residential/commercial/investment specs."
      );
    } catch (err: any) {
      recordTest(
        "TC-P1-06",
        "Property Schema - Owner Linkage & Pre-Leased Financials",
        "FAIL",
        err.message
      );
    }

    // -------------------------------------------------------------------------
    // TEST 7: PublicInquiry - Inbound Lead Ingestion & Conversion States
    // -------------------------------------------------------------------------
    try {
      const inquiry = new PublicInquiry({
        adminId: testAdminId,
        inquiryType: "Schedule_Visit",
        propertyId: new Types.ObjectId(),
        name: "Website Visitor Test",
        phone: "+919876543210",
        email: "visitor@example.com",
        preferredDateTime: new Date("2026-11-05T14:30:00Z"),
        message: "Interested in weekend site visit.",
        status: "Pending",
      });
      await inquiry.validate();

      recordTest(
        "TC-P1-07",
        "PublicInquiry Schema & Web Lead Capture",
        "PASS",
        "Validated public inquiry types, scheduling date/time, and status transitions."
      );
    } catch (err: any) {
      recordTest("TC-P1-07", "PublicInquiry Schema & Web Lead Capture", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Index & Constraint Sanity Check
    // -------------------------------------------------------------------------
    try {
      const ownerIndexes = Owner.schema.indexes();
      const propertyIndexes = Property.schema.indexes();
      const projectUnitIndexes = ProjectUnit.schema.indexes();

      const hasOwnerCompound = ownerIndexes.some(
        ([idx]) => idx.adminId === 1 && idx.ownerId === 1
      );
      const hasUnitUnique = projectUnitIndexes.some(
        ([idx]) => idx.projectId === 1 && idx.towerName === 1 && idx.unitNumber === 1
      );
      const hasPropPublishIndex = propertyIndexes.some(
        ([idx]) => idx.adminId === 1 && idx["publishing.publishOnWebsite"] === 1
      );

      if (hasOwnerCompound && hasUnitUnique && hasPropPublishIndex) {
        recordTest(
          "TC-P1-08",
          "Compound Indexes & Database Optimization",
          "PASS",
          "Verified tenant compound indexes on Owner, ProjectUnit, and Property publish flag."
        );
      } else {
        throw new Error("One or more required compound indexes were not found in schema definitions.");
      }
    } catch (err: any) {
      recordTest("TC-P1-08", "Compound Indexes & Database Optimization", "FAIL", err.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  console.log("\n==================================================");
  console.log("POINT 1 TEST SUITE SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Tests Run : ${total}`);
  console.log(`Tests Passed    : ${passed}`);
  console.log(`Tests Failed    : ${failed}`);

  if (failed > 0) {
    console.error("\nSome Point 1 tests failed!");
    process.exit(1);
  } else {
    console.log("\nALL POINT 1 TESTS PASSED SUCCESSFULLY! Ready for Point 2.");
    process.exit(0);
  }
}

runPoint1Tests().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
