import { NextRequest } from "next/server";
import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { GET as getProjects, POST as postProject } from "../src/app/api/projects/route";
import { GET as getProjectById, DELETE as deleteProjectById } from "../src/app/api/projects/[id]/route";
import { GET as getUnits, POST as postUnit } from "../src/app/api/projects/[id]/units/route";
import { PATCH as updateUnitStatus } from "../src/app/api/projects/units/[unitId]/status/route";
import { getSsrProjects, getProjectStructureTree, recalculateProjectCounters } from "../src/services/projectService";
import { Project } from "../src/models/Project";
import { ProjectUnit } from "../src/models/ProjectUnit";
import { User } from "../src/models/User";
import { Role } from "../src/models/Role";
import { Client } from "../src/models/Client";
import { signAuthToken } from "../src/lib/auth/jwt";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

interface Point4TestResult {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: Point4TestResult[] = [];

function recordTest(id: string, name: string, status: "PASS" | "FAIL", details: string) {
  results.push({ id, name, status, details });
  console.log(`[${status}] ${id}: ${name} - ${details}`);
}

async function runPoint4Tests() {
  console.log("--------------------------------------------------");
  console.log("STARTING POINT 4: PROJECTS & UNITS TEST SUITE (WITH SSR)");
  console.log("--------------------------------------------------");

  if (!MONGODB_URI) throw new Error("MONGODB_URI missing");
  await mongoose.connect(MONGODB_URI);

  let adminAUser: any = null;
  let adminBUser: any = null;
  let testBuyerClient: any = null;
  let createdProjectId: string = "";
  let createdUnitId1: string = "";
  let createdUnitId2: string = "";

  try {
    const adminRole = await Role.findOne({ slug: "admin" });
    const timestamp = Date.now();

    adminAUser = await User.create({
      name: "Admin Org A Projects",
      email: `adminA_proj_${timestamp}@test.com`,
      mobile: `91${timestamp.toString().slice(-8)}`,
      joiningDate: new Date(),
      passwordHash: "hash123",
      roleId: adminRole?._id,
      role: adminRole,
      status: "active",
    });

    adminBUser = await User.create({
      name: "Admin Org B Projects",
      email: `adminB_proj_${timestamp}@test.com`,
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

    testBuyerClient = await Client.create({
      adminId: adminAUser._id,
      clientName: "Ananya Iyer",
      phone: `94${timestamp.toString().slice(-8)}`,
      email: `ananya_${timestamp}@test.com`,
      createdById: adminAUser._id,
    });

    // -------------------------------------------------------------------------
    // TEST 1: POST /api/projects - Create Project & Auto ID (PRJ-YYYY-XXXX)
    // -------------------------------------------------------------------------
    try {
      const req = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Skyline Serenity Towers",
          developerName: "Skyline Developers Group",
          projectType: "Residential",
          constructionStatus: "Under Construction",
          location: {
            address: "Survey 12, Whitefield Main Road",
            city: "Bengaluru",
            landmark: "Opposite Tech Park",
          },
          reraNumber: "PRM/KA/RERA/1251/446/PR/2026",
          amenities: ["Swimming Pool", "Gym", "Clubhouse", "24/7 Security"],
          isPublishedOnWebsite: true,
        }),
      });

      const res = await postProject(req);
      const json = await res.json();

      if (res.status !== 201 || !json.data?._id || !json.data?.projectId) {
        throw new Error(`Expected 201 Created with projectId, got ${res.status}: ${JSON.stringify(json)}`);
      }
      createdProjectId = json.data._id;

      recordTest(
        "TC-P4-01",
        "POST /api/projects Project Creation & ID Format",
        "PASS",
        `Created project with auto-generated ID [${json.data.projectId}], MongoDB ID: ${createdProjectId}`
      );
    } catch (err: any) {
      recordTest("TC-P4-01", "POST /api/projects Project Creation & ID Format", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: POST /api/projects/[id]/units - Hierarchical Unit Association & Duplicate Guard
    // -------------------------------------------------------------------------
    try {
      // Unit 1
      const req1 = new NextRequest(`http://localhost:3000/api/projects/${createdProjectId}/units`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          towerName: "Tower A",
          floorNumber: 4,
          unitNumber: "A-401",
          unitType: "2BHK",
          carpetArea: 950,
          price: 7200000,
          status: "Available",
        }),
      });
      const res1 = await postUnit(req1, { params: Promise.resolve({ id: createdProjectId }) });
      const json1 = await res1.json();
      if (res1.status !== 201) throw new Error(`Unit 1 creation failed: ${JSON.stringify(json1)}`);
      createdUnitId1 = json1.data._id;

      // Unit 2
      const req2 = new NextRequest(`http://localhost:3000/api/projects/${createdProjectId}/units`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          towerName: "Tower A",
          floorNumber: 4,
          unitNumber: "A-402",
          unitType: "3BHK",
          carpetArea: 1350,
          price: 11000000,
          status: "Available",
        }),
      });
      const res2 = await postUnit(req2, { params: Promise.resolve({ id: createdProjectId }) });
      const json2 = await res2.json();
      if (res2.status !== 201) throw new Error(`Unit 2 creation failed: ${JSON.stringify(json2)}`);
      createdUnitId2 = json2.data._id;

      // Duplicate test: Re-add A-401 to Tower A
      const reqDup = new NextRequest(`http://localhost:3000/api/projects/${createdProjectId}/units`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          towerName: "Tower A",
          floorNumber: 4,
          unitNumber: "A-401",
          unitType: "2BHK",
          price: 7200000,
        }),
      });
      const resDup = await postUnit(reqDup, { params: Promise.resolve({ id: createdProjectId }) });
      if (resDup.status !== 409) {
        throw new Error(`Expected 409 Conflict for duplicate unitNumber in same tower, got ${resDup.status}`);
      }

      recordTest(
        "TC-P4-02",
        "POST /api/projects/[id]/units Unit Hierarchy & Unique Tower-Unit Guard",
        "PASS",
        "Created Units A-401 & A-402 and successfully blocked duplicate unit in same tower (409 Conflict)."
      );
    } catch (err: any) {
      recordTest("TC-P4-02", "POST /api/projects/[id]/units Unit Hierarchy & Unique Tower-Unit Guard", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Real-Time Unit Availability Counter Rollups
    // -------------------------------------------------------------------------
    try {
      const pDoc = await Project.findById(createdProjectId).lean();
      if (!pDoc) throw new Error("Project not found");

      if (pDoc.totalUnits !== 2 || pDoc.availableUnits !== 2 || pDoc.bookedUnits !== 0 || pDoc.soldUnits !== 0) {
        throw new Error(`Expected total: 2, available: 2. Got total: ${pDoc.totalUnits}, avail: ${pDoc.availableUnits}`);
      }

      // Transition Unit 1 to 'Booked'
      const reqBook = new NextRequest(`http://localhost:3000/api/projects/units/${createdUnitId1}/status`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "Booked",
          clientId: testBuyerClient._id.toString(),
        }),
      });
      const resBook = await updateUnitStatus(reqBook, { params: Promise.resolve({ unitId: createdUnitId1 }) });
      if (resBook.status !== 200) throw new Error(`Booking unit failed: ${resBook.status}`);

      // Check project live counters
      const updatedP = await Project.findById(createdProjectId).lean();
      if (updatedP?.availableUnits !== 1 || updatedP?.bookedUnits !== 1) {
        throw new Error(`Counters did not update correctly after booking: Avail: ${updatedP?.availableUnits}, Booked: ${updatedP?.bookedUnits}`);
      }

      recordTest(
        "TC-P4-03",
        "Real-Time Unit Availability Rollup Recalculation",
        "PASS",
        `After booking Unit A-401: Available: ${updatedP.availableUnits}, Booked: ${updatedP.bookedUnits}, Total: ${updatedP.totalUnits}`
      );
    } catch (err: any) {
      recordTest("TC-P4-03", "Real-Time Unit Availability Rollup Recalculation", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Double Booking Concurrency Protection
    // -------------------------------------------------------------------------
    try {
      // Attempt to book Unit A-401 again when it is already 'Booked'
      const reqDouble = new NextRequest(`http://localhost:3000/api/projects/units/${createdUnitId1}/status`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${adminAToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "Booked",
          clientId: testBuyerClient._id.toString(),
        }),
      });
      const resDouble = await updateUnitStatus(reqDouble, { params: Promise.resolve({ unitId: createdUnitId1 }) });

      if (resDouble.status !== 409) {
        throw new Error(`Expected 409 Conflict when booking already-booked unit, got ${resDouble.status}`);
      }

      recordTest(
        "TC-P4-04",
        "Double-Booking Concurrency Protection",
        "PASS",
        "Successfully prevented double-booking already reserved unit (409 Conflict)."
      );
    } catch (err: any) {
      recordTest("TC-P4-04", "Double-Booking Concurrency Protection", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: SSR getSsrProjects() & Structural Tree Hierarchy Fetch
    // -------------------------------------------------------------------------
    try {
      // SSR Loader check with tenant isolation
      const adminASsr = await getSsrProjects({
        userId: adminAUser._id.toString(),
        roleSlug: "admin",
      });

      const adminBSsr = await getSsrProjects({
        userId: adminBUser._id.toString(),
        roleSlug: "admin",
      });

      const adminAHasIt = adminASsr.projects.some((p) => p._id === createdProjectId);
      const adminBHasIt = adminBSsr.projects.some((p) => p._id === createdProjectId);

      if (!adminAHasIt) throw new Error("Admin A SSR could not see created project.");
      if (adminBHasIt) throw new Error("Admin B SSR leaked project belonging to Admin A!");

      // Structural Tree check: Project -> Towers -> Floors -> Units
      const tree = await getProjectStructureTree(createdProjectId, adminAUser._id.toString());
      if (!tree || tree.structure.length === 0) throw new Error("Structural tree returned empty");

      const towerA = tree.structure.find((t: any) => t.towerName === "Tower A");
      if (!towerA || towerA.floors.length === 0) throw new Error("Tower A not found in structure tree");

      const floor4 = towerA.floors.find((f: any) => f.floorNumber === 4);
      if (!floor4 || floor4.units.length !== 2) throw new Error(`Floor 4 expected 2 units, got ${floor4?.units?.length}`);

      recordTest(
        "TC-P4-05",
        "SSR getSsrProjects() Scoping & Structural Hierarchy Tree",
        "PASS",
        `SSR rendered project with live counters; Structural tree correctly resolved Tower A -> Floor 4 -> 2 Units.`
      );
    } catch (err: any) {
      recordTest("TC-P4-05", "SSR getSsrProjects() Scoping & Structural Hierarchy Tree", "FAIL", err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Project Deletion Guard on Booked/Sold Units
    // -------------------------------------------------------------------------
    try {
      const reqDel = new NextRequest(`http://localhost:3000/api/projects/${createdProjectId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminAToken}` },
      });
      const resDel = await deleteProjectById(reqDel, { params: Promise.resolve({ id: createdProjectId }) });

      if (resDel.status !== 400) {
        throw new Error(`Expected 400 Bad Request when project contains booked units, got ${resDel.status}`);
      }

      recordTest(
        "TC-P4-06",
        "DELETE /api/projects/[id] Booked/Sold Units Deletion Guard",
        "PASS",
        "Blocked project deletion because active booked units exist (400 Bad Request)."
      );
    } catch (err: any) {
      recordTest("TC-P4-06", "DELETE /api/projects/[id] Booked/Sold Units Deletion Guard", "FAIL", err.message);
    }
  } finally {
    // Cleanup test records
    await ProjectUnit.deleteMany({ projectId: new Types.ObjectId(createdProjectId) });
    if (createdProjectId) await Project.findByIdAndDelete(createdProjectId);
    if (testBuyerClient?._id) await Client.findByIdAndDelete(testBuyerClient._id);
    if (adminAUser?._id) await User.findByIdAndDelete(adminAUser._id);
    if (adminBUser?._id) await User.findByIdAndDelete(adminBUser._id);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  console.log("\n==================================================");
  console.log("POINT 4 TEST SUITE SUMMARY");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Point 4 Tests Run : ${total}`);
  console.log(`Tests Passed            : ${passed}`);
  console.log(`Tests Failed            : ${failed}`);

  if (failed > 0) {
    console.error("\nSome Point 4 tests failed!");
    process.exit(1);
  } else {
    console.log("\nALL POINT 4 TESTS PASSED SUCCESSFULLY! (100% SUCCESS)");
    process.exit(0);
  }
}

runPoint4Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

