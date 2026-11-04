import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongodb/db";
import { User } from "../src/models/User";
import { Owner } from "../src/models/Owner";
import { Property } from "../src/models/Property";
import { Project } from "../src/models/Project";
import { GET as getPublicPropertiesHandler } from "../src/app/api/public/properties/route";
import { GET as getPublicPropertyDetailHandler } from "../src/app/api/public/properties/[slug]/route";
import { GET as getPublicProjectsHandler } from "../src/app/api/public/projects/route";
import { GET as getPublicProjectDetailHandler } from "../src/app/api/public/projects/[slug]/route";
import { getPublicProperties, getPublicPropertyBySlug } from "../src/services/publicPortalService";
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

async function runPoint6Tests() {
  console.log("--------------------------------------------------");
  console.log("STARTING POINT 6: WEBSITE PUBLIC SANITIZED APIs TEST SUITE (WITH SSR)");
  console.log("--------------------------------------------------");

  try {
    await connectToDatabase();

    // 1. Setup Mock Admin and Owner
    const adminUser = await User.findOneAndUpdate(
      { email: "admin.point6@example.com" },
      {
        email: "admin.point6@example.com",
        name: "Point6 Agency Admin",
        role: "admin",
        password: "hashed_password",
        status: "active",
        mobile: "9199990006",
        joiningDate: new Date(),
      },
      { upsert: true, new: true }
    );

    const testOwner = await Owner.findOneAndUpdate(
      { mobile: "9876543260" },
      {
        adminId: adminUser._id,
        ownerId: "OWN-2026-9999",
        name: "Shri Secret Landlord",
        mobile: "9876543260",
        email: "private.owner@confidential.com",
        panGstNumber: "ABCDE1234F",
        ownershipType: "Individual",
        preferredContactMethod: "Call",
        notes: "INTERNAL CONFIDENTIAL NOTE: Owner wants immediate liquidity. Do not reveal contact.",
        createdById: adminUser._id,
      },
      { upsert: true, new: true }
    );

    // Clean up prior test items
    await Property.deleteMany({ adminId: adminUser._id });
    await Project.deleteMany({ adminId: adminUser._id });

    // 2. Create Public Project
    const publicProject = await Project.create({
      adminId: adminUser._id,
      projectId: "PRJ-2026-P601",
      name: "Grand Horizon Residences",
      developerName: "Horizon Luxury Developers",
      projectType: "Residential",
      location: {
        address: "Marathahalli-Sarjapur Outer Ring Road",
        city: "Bengaluru",
        landmark: "Next to Tech Park",
        pincode: "560103",
      },
      constructionStatus: "Under Construction",
      amenities: ["Infinity Pool", "Clubhouse", "Squash Court"],
      media: {
        coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00",
        images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00"],
      },
      totalUnits: 120,
      availableUnits: 45,
      bookedUnits: 50,
      soldUnits: 25,
      isPublishedOnWebsite: true,
      featuredOnWebsite: true,
      seo: {
        slug: "grand-horizon-residences",
        metaTitle: "Grand Horizon Luxury Apartments",
      },
      createdById: adminUser._id,
    });

    // 3. Create Sample Properties:
    // Prop A: Published Residential Flat For Sale (Publicly Visible)
    const publishedProp = await Property.create({
      adminId: adminUser._id,
      propertyId: "PROP-2026-6001",
      title: "Panoramic 3BHK Lakeview Luxury Suite",
      propertyCategory: "Residential",
      propertyType: "apartment",
      transactionType: "Sale",
      listingType: "Exclusive",
      status: "Available",
      ownerId: testOwner._id,
      projectId: publicProject._id,
      pricing: {
        price: 18500000,
        pricePerUnitArea: 10000,
        isNegotiable: true,
        brokerageTerms: "2% brokerage payable by buyer on closing", // CONFIDENTIAL
      },
      areaDetails: {
        carpetArea: 1850,
        areaUnit: "Sq. Ft.",
      },
      location: {
        address: "Sarjapur Road, Tower A",
        city: "Bengaluru",
        landmark: "Opposite Wipro SEZ",
        pincode: "560035",
      },
      residentialSpecs: {
        bedrooms: 3,
        bathrooms: 3,
        balconies: 2,
        furnishing: "Semi-Furnished",
      },
      amenities: ["Swimming Pool", "Gym", "Covered Parking"],
      media: {
        images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c"],
      },
      publishing: {
        publishOnWebsite: true,
        featuredProperty: true,
        publishedAt: new Date(),
        seo: {
          slug: "panoramic-3bhk-lakeview-luxury-suite",
        },
      },
      createdById: adminUser._id,
    });

    // Prop B: Unpublished Property (Draft / Internal Only)
    await Property.create({
      adminId: adminUser._id,
      propertyId: "PROP-2026-6002",
      title: "Internal Unlisted Commercial Plot",
      propertyCategory: "Land",
      propertyType: "commercial_land",
      transactionType: "Sale",
      listingType: "Direct",
      status: "Available",
      ownerId: testOwner._id,
      pricing: { price: 50000000, isNegotiable: false },
      areaDetails: { plotArea: 10000, areaUnit: "Sq. Ft." },
      location: { address: "Industrial Zone", city: "Bengaluru" },
      publishing: {
        publishOnWebsite: false, // NOT PUBLISHED
        featuredProperty: false,
        seo: { slug: "internal-unlisted-commercial-plot" },
      },
      createdById: adminUser._id,
    });

    // Prop C: Sold Property (Status Inactive)
    await Property.create({
      adminId: adminUser._id,
      propertyId: "PROP-2026-6003",
      title: "Recently Sold Luxury Villa",
      propertyCategory: "Residential",
      propertyType: "villa",
      transactionType: "Sale",
      listingType: "Direct",
      status: "Sold", // SOLD
      ownerId: testOwner._id,
      pricing: { price: 30000000, isNegotiable: false },
      areaDetails: { carpetArea: 3200, areaUnit: "Sq. Ft." },
      location: { address: "Whitefield", city: "Bengaluru" },
      publishing: {
        publishOnWebsite: true, // Should still be excluded by search filter because status !== "Available"
        featuredProperty: false,
        seo: { slug: "recently-sold-luxury-villa" },
      },
      createdById: adminUser._id,
    });

    // Prop D: Rental Flat in Mumbai (For Filter Testing)
    await Property.create({
      adminId: adminUser._id,
      propertyId: "PROP-2026-6004",
      title: "Sea Facing 2BHK Rental Apartment Bandra",
      propertyCategory: "Residential",
      propertyType: "apartment",
      transactionType: "Rent",
      listingType: "Direct",
      status: "Available",
      ownerId: testOwner._id,
      pricing: { monthlyRent: 85000, isNegotiable: true },
      areaDetails: { carpetArea: 950, areaUnit: "Sq. Ft." },
      location: { address: "Carter Road", city: "Mumbai" },
      residentialSpecs: { bedrooms: 2, bathrooms: 2, furnishing: "Fully-Furnished" },
      publishing: {
        publishOnWebsite: true,
        featuredProperty: false,
        seo: { slug: "sea-facing-2bhk-rental-bandra" },
      },
      createdById: adminUser._id,
    });

    // =========================================================================
    // TC-CMS-01: Public Sanitized Data Detail Page & Security Leak Guard
    // =========================================================================
    const req1 = new NextRequest("http://localhost:3000/api/public/properties/panoramic-3bhk-lakeview-luxury-suite");
    const res1 = await getPublicPropertyDetailHandler(req1, {
      params: Promise.resolve({ slug: "panoramic-3bhk-lakeview-luxury-suite" }),
    });
    const data1 = await res1.json();

    const isSanitized =
      data1.success === true &&
      data1.data.title === "Panoramic 3BHK Lakeview Luxury Suite" &&
      data1.data.ownerId === undefined &&
      data1.data.owner === undefined &&
      data1.data.pricing.brokerageTerms === undefined &&
      !JSON.stringify(data1).includes("9876543260") &&
      !JSON.stringify(data1).includes("ABCDE1234F") &&
      !JSON.stringify(data1).includes("Shri Secret Landlord");

    recordResult(
      "TC-CMS-01: Public Sanitized Property Detail API (Owner PAN, Phone, Commission Excluded)",
      isSanitized,
      "Strict data sanitization verified. Zero owner/broker confidential leaks in API payload."
    );

    // =========================================================================
    // TC-CMS-02: Public Property Listings Multi-Parameter Search & Filter
    // =========================================================================
    // Filter 1: TransactionType=Rent in Mumbai
    const req2 = new NextRequest("http://localhost:3000/api/public/properties?transactionType=Rent&city=Mumbai");
    const res2 = await getPublicPropertiesHandler(req2);
    const data2 = await res2.json();

    const rentFilterOk =
      data2.success === true &&
      data2.data.length === 1 &&
      data2.data[0].propertyId === "PROP-2026-6004" &&
      data2.data[0].pricing.monthlyRent === 85000;

    recordResult(
      "TC-CMS-02: Public Property Listings Multi-Parameter Filter (Rent in Mumbai)",
      rentFilterOk,
      `Returned exactly ${data2.data?.length} listing (Monthly Rent: ₹${data2.data?.[0]?.pricing?.monthlyRent})`
    );

    // =========================================================================
    // TC-CMS-03: Website Visibility Rules (Status=Available & publishOnWebsite=true)
    // =========================================================================
    // Must suppress unpublished PROP-2026-6002 and sold PROP-2026-6003
    const req3 = new NextRequest(`http://localhost:3000/api/public/properties?adminId=${adminUser._id}`);
    const res3 = await getPublicPropertiesHandler(req3);
    const data3 = await res3.json();

    const ids: string[] = data3.data.map((p: any) => p.propertyId);
    const visibilityGuardsPassed =
      ids.includes("PROP-2026-6001") &&
      ids.includes("PROP-2026-6004") &&
      !ids.includes("PROP-2026-6002") && // unpublished
      !ids.includes("PROP-2026-6003"); // sold

    recordResult(
      "TC-CMS-03: Website Visibility Rules Guard (Excludes Drafts & Inactive Listings)",
      visibilityGuardsPassed,
      `Returned active published properties only (${ids.join(", ")}). Suppressed drafts and sold records.`
    );

    // =========================================================================
    // TC-CMS-04: Public Projects Search & Detail APIs
    // =========================================================================
    const req4 = new NextRequest("http://localhost:3000/api/public/projects?featured=true");
    const res4 = await getPublicProjectsHandler(req4);
    const data4 = await res4.json();

    const req4Detail = new NextRequest("http://localhost:3000/api/public/projects/grand-horizon-residences");
    const res4Detail = await getPublicProjectDetailHandler(req4Detail, {
      params: Promise.resolve({ slug: "grand-horizon-residences" }),
    });
    const data4Detail = await res4Detail.json();

    const projectApisOk =
      data4.success === true &&
      data4.data.length >= 1 &&
      data4Detail.success === true &&
      data4Detail.data.name === "Grand Horizon Residences" &&
      data4Detail.data.availableUnits === 45;

    recordResult(
      "TC-CMS-04: Public Projects & Sanitized Detail API",
      projectApisOk,
      `Project '${data4Detail.data?.name}' retrieved with ${data4Detail.data?.availableUnits} live available units.`
    );

    // =========================================================================
    // TC-CMS-05: SSR Direct Pre-Rendering Performance & Reliability
    // =========================================================================
    const ssrStart = Date.now();
    const ssrResults = await getPublicProperties({
      adminId: adminUser._id.toString(),
      bedrooms: 3,
    });
    const ssrDuration = Date.now() - ssrStart;

    const ssrPassed =
      ssrResults.properties.length === 1 &&
      ssrResults.properties[0].propertyId === "PROP-2026-6001" &&
      ssrResults.properties[0].residentialSpecs?.bedrooms === 3 &&
      ssrDuration < 500;

    recordResult(
      "TC-CMS-05: SSR Pre-Rendering Service getPublicProperties() (Instant Server Query)",
      ssrPassed,
      `Rendered 3BHK listing directly in ${ssrDuration}ms on the server with zero client latency.`
    );

    // Cleanup
    await Property.deleteMany({ adminId: adminUser._id });
    await Project.deleteMany({ adminId: adminUser._id });
    await Owner.deleteOne({ _id: testOwner._id });
    await User.deleteOne({ _id: adminUser._id });
  } catch (error: any) {
    console.error("Critical Test Execution Error:", error);
    recordResult("Critical Point 6 Test Error", false, undefined, error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  // Summary
  console.log("\n==================================================");
  console.log("POINT 6 TEST SUITE SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Point 6 Tests Run : ${total}`);
  console.log(`Tests Passed            : ${passed}`);
  console.log(`Tests Failed            : ${failed}`);

  if (failed === 0) {
    console.log("\nALL POINT 6 TESTS PASSED SUCCESSFULLY! (100% SUCCESS)\n");
    process.exit(0);
  } else {
    console.error("\nSOME POINT 6 TESTS FAILED.\n");
    process.exit(1);
  }
}

runPoint6Tests();
