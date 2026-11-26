import { describe, expect, it } from "vitest";
import {
  buildPropertiesCsvBytes,
  buildPropertiesExcelBytes,
  buildPropertiesPdfBytes,
  buildProjectsCsvBytes,
  buildProjectsExcelBytes,
  buildProjectsPdfBytes,
  buildBookingsCsvBytes,
  buildBookingsExcelBytes,
  buildBookingsPdfBytes,
  buildOwnersCsvBytes,
  buildOwnersExcelBytes,
  buildOwnersPdfBytes,
  buildInquiriesCsvBytes,
  buildInquiriesExcelBytes,
  buildInquiriesPdfBytes,
} from "@/lib/export/realEstateModuleExports";

function assertValidExports(
  csv: Uint8Array,
  xlsx: Uint8Array,
  pdf: Uint8Array,
  expectedText: string,
  expectedTitle: string,
) {
  expect(csv.slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
  expect(new TextDecoder().decode(csv.slice(3))).toContain(expectedText);

  expect(xlsx.slice(0, 4)).toEqual(new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
  expect(new TextDecoder().decode(xlsx)).toContain(expectedText);

  const pdfText = new TextDecoder("latin1").decode(pdf);
  expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
  expect(pdfText.trimEnd().endsWith("%%EOF")).toBe(true);
  expect(pdfText).toContain(expectedTitle);
  expect(pdfText).toContain(expectedText);
}

describe("realEstateModuleExports", () => {
  it("exports Properties Inventory to CSV, Excel, and PDF", () => {
    const sample = [
      {
        _id: "p1",
        propertyId: "PRP-101",
        title: "Sea View Penthouse",
        propertyCategory: "Residential",
        propertyType: "Penthouse",
        transactionType: "Sale",
        status: "Available",
        owner: { name: "Vikram Patel", mobile: "9820111222" },
        pricing: { price: 42500000 },
        areaDetails: { carpetArea: 2800, areaUnit: "Sq.Ft" },
        location: { city: "Mumbai", address: "Worli Sea Face" },
        createdAt: "2026-11-20T10:00:00.000Z",
      },
    ];
    assertValidExports(
      buildPropertiesCsvBytes(sample),
      buildPropertiesExcelBytes(sample, { generatedBy: "Admin" }),
      buildPropertiesPdfBytes(sample, { generatedBy: "Admin" }),
      "Sea View Penthouse",
      "Properties Inventory Report",
    );
  });

  it("exports Projects & Units to CSV, Excel, and PDF", () => {
    const sample = [
      {
        _id: "proj1",
        projectId: "PRJ-501",
        name: "Skyline Crest Towers",
        developerName: "Apex Infra",
        projectType: "Residential",
        constructionStatus: "Under Construction",
        carpetArea: 1450,
        location: { city: "Bengaluru", address: "Whitefield" },
        availableUnits: 24,
        bookedUnits: 12,
        soldUnits: 14,
        totalUnits: 50,
        createdAt: "2026-11-18T10:00:00.000Z",
      },
    ];
    assertValidExports(
      buildProjectsCsvBytes(sample),
      buildProjectsExcelBytes(sample, { generatedBy: "Admin" }),
      buildProjectsPdfBytes(sample, { generatedBy: "Admin" }),
      "Skyline Crest Towers",
      "Projects & Structural Units Report",
    );
  });

  it("exports Client Track Record bookings to CSV, Excel, and PDF", () => {
    const sample = [
      {
        _id: "b1",
        bookingNumber: "BK-2026-009",
        clientId: { clientName: "Meera Kapoor", phone: "9811199988" },
        inventoryLabel: "Tower A / 1204",
        agreementValue: 16000000,
        totalPaid: 4000000,
        balanceAmount: 12000000,
        bookingStatus: "Booked",
        documents: [{ title: "Allotment Letter" }],
        createdAt: "2026-11-21T10:00:00.000Z",
      },
    ];
    assertValidExports(
      buildBookingsCsvBytes(sample),
      buildBookingsExcelBytes(sample, { generatedBy: "Admin" }),
      buildBookingsPdfBytes(sample, { generatedBy: "Admin" }),
      "Meera Kapoor",
      "Client Track Record & Document Locker Report",
    );
  });

  it("exports Property Owners to CSV, Excel, and PDF", () => {
    const sample = [
      {
        _id: "o1",
        ownerId: "OWN-015",
        name: "Suresh Iyer",
        mobile: "9845011223",
        email: "suresh@example.com",
        ownershipType: "Individual",
        panGstNumber: "ABCDE1234F",
        company: "Iyer Holdings",
        totalPropertiesOwned: 3,
        documentsCount: 2,
      },
    ];
    assertValidExports(
      buildOwnersCsvBytes(sample),
      buildOwnersExcelBytes(sample, { generatedBy: "Admin" }),
      buildOwnersPdfBytes(sample, { generatedBy: "Admin" }),
      "Suresh Iyer",
      "Property Owners Registry Report",
    );
  });

  it("exports Website Inquiries to CSV, Excel, and PDF", () => {
    const sample = [
      {
        id: "inq1",
        inquiryType: "Property",
        name: "Devika Rao",
        phone: "9900112233",
        email: "devika@example.com",
        message: "Looking for site visit on Saturday",
        status: "Converted_To_Lead",
        crmLead: { title: "3BHK Marine Drive" },
        property: { title: "Emerald Court", propertyId: "PRP-88" },
        createdAt: "2026-11-25T10:00:00.000Z",
      },
    ];
    assertValidExports(
      buildInquiriesCsvBytes(sample),
      buildInquiriesExcelBytes(sample, { generatedBy: "Admin" }),
      buildInquiriesPdfBytes(sample, { generatedBy: "Admin" }),
      "Devika Rao",
      "Inbound Website Inquiries Report",
    );
  });
});
