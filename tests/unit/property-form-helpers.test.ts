import { describe, expect, it } from "vitest";
import {
  extractPropertyFormState,
  getExtraSavedAmenities,
  isAmenitySelected,
  resolveMatchingSelectValue,
  shouldHideResidentialSpecsSection,
  toggleAmenitySelection,
} from "@/lib/propertyFormHelpers";

describe("propertyFormHelpers", () => {
  it("extracts zero bedrooms/bathrooms and populated GET /api/properties/[id] specs accurately", () => {
    const apiDoc = {
      _id: "prop_1",
      title: "Commercial Studio",
      propertyCategory: "Commercial",
      propertyType: "office_space",
      transactionType: "Lease",
      status: "Available",
      ownerId: {
        _id: "owner_1",
        name: "Ramesh Kumar",
        mobile: "9876543210",
      },
      location: {
        city: "Nagpur",
        address: "Dharampeth",
        googleMapsEmbedUrl: "https://maps.example/embed",
      },
      pricing: {
        price: 0,
        monthlyRent: 45000,
      },
      areaDetails: {
        carpetArea: 850,
        areaUnit: "Sq. Ft.",
      },
      residentialSpecs: {
        bedrooms: 0,
        bathrooms: 0,
        furnishing: "Semi-Furnished",
      },
      amenities: ["Power Backup", "24/7 Security"],
      media: {
        images: ["/uploads/a.jpg"],
        floorPlanMaps: [],
      },
      publishing: {
        publishOnWebsite: true,
      },
    };

    const furnishingOpts = [
      { value: "Unfurnished", label: "Unfurnished" },
      { value: "Semi Furnished", label: "Semi Furnished" },
      { value: "Fully Furnished", label: "Fully Furnished" },
    ];

    const result = extractPropertyFormState(apiDoc, furnishingOpts);

    expect(result.formData.bedrooms).toBe(0);
    expect(result.formData.bathrooms).toBe(0);
    expect(result.formData.furnishing).toBe("Semi Furnished");
    expect(result.formData.ownerId).toBe("owner_1");
    expect(result.selectedOwnerLabel).toBe("Ramesh Kumar (9876543210)");
    expect(result.formData.amenities).toEqual(["Power Backup", "24/7 Security"]);
    expect(result.existingImages).toEqual(["/uploads/a.jpg"]);
  });

  it("extracts SSR property items and preserves top-level specs and amenities", () => {
    const ssrItem = {
      _id: "prop_2",
      title: "Skyline 4BHK",
      propertyCategory: "Residential",
      propertyType: "apartment",
      transactionType: "Sale",
      status: "Hold",
      owner: {
        _id: "owner_2",
        name: "Anita Verma",
        mobile: "9988776655",
      },
      location: { city: "Pune", address: "Koregaon Park" },
      pricing: { price: 12500000 },
      areaDetails: { carpetArea: 2100, areaUnit: "Sq. Ft." },
      bedrooms: 4,
      bathrooms: 4,
      furnishing: "Fully-Furnished",
      amenities: ["Swimming Pool", "Gymnasium"],
      publishing: { publishOnWebsite: false },
    };

    const result = extractPropertyFormState(ssrItem, [
      { value: "Fully-Furnished", label: "Fully-Furnished" },
    ]);

    expect(result.formData.bedrooms).toBe(4);
    expect(result.formData.bathrooms).toBe(4);
    expect(result.formData.furnishing).toBe("Fully-Furnished");
    expect(result.formData.amenities).toEqual(["Swimming Pool", "Gymnasium"]);
    expect(result.formData.publishOnWebsite).toBe(false);
  });

  it("matches furnishing tokens and toggles amenities case-insensitively", () => {
    expect(
      resolveMatchingSelectValue(
        "fully_furnished",
        [{ value: "Fully Furnished", label: "Fully Furnished" }],
        "Unfurnished",
      ),
    ).toBe("Fully Furnished");

    expect(isAmenitySelected(["Swimming Pool", "gymnasium"], "Gymnasium")).toBe(
      true,
    );
    expect(
      toggleAmenitySelection(["Swimming Pool", "gymnasium"], "Gymnasium"),
    ).toEqual(["Swimming Pool"]);
    expect(toggleAmenitySelection(["Swimming Pool"], "Clubhouse")).toEqual([
      "Swimming Pool",
      "Clubhouse",
    ]);
    expect(
      getExtraSavedAmenities(
        ["Swimming Pool", "Solar Rooftop"],
        ["Swimming Pool", "Gymnasium"],
      ),
    ).toEqual(["Solar Rooftop"]);
  });

  it("hides residential specs & amenities for the configured commercial, land, and investment property types", () => {
    const hiddenTypes = [
      "commercial_office",
      "Commercial Office",
      "office_space",
      "retail_shop",
      "Retail Shop / Showroom",
      "warehouse",
      "Warehouse / Godown",
      "industrial_property",
      "Industrial Property",
      "commercial_land",
      "Commercial Land",
      "agricultural_land",
      "Agricultural Land / Farm",
      "na_plot",
      "NA Plot",
      "pre_leased_commercial",
      "Pre-Leased Commercial",
      "income_generating_property",
      "Income Generating Property",
    ];

    for (const typeName of hiddenTypes) {
      expect(shouldHideResidentialSpecsSection(typeName)).toBe(true);
    }

    const residentialTypes = [
      "apartment",
      "Apartment / Flat",
      "villa",
      "Independent House / Villa",
      "penthouse",
      "builder_floor",
      "studio_apartment",
      "bungalow",
    ];

    for (const typeName of residentialTypes) {
      expect(shouldHideResidentialSpecsSection(typeName)).toBe(false);
    }
  });
});
