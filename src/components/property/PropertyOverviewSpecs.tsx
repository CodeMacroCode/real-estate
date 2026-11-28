import React from "react";
import { shouldHideResidentialSpecsSection } from "@/lib/propertyFormHelpers";

interface PropertyOverviewSpecsProps {
  carpetArea?: number;
  areaUnit?: string;
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  furnishing?: string;
  facing?: string;
  floorNo?: number;
  totalFloors?: number;
  propertyType?: string;
  propertyCategory?: string;
  officeNumber?: string;
}

export function PropertyOverviewSpecs({
  carpetArea,
  areaUnit = "Sq. Ft.",
  bedrooms,
  bathrooms,
  balconies,
  furnishing,
  facing,
  floorNo,
  totalFloors,
  propertyType,
  propertyCategory,
  officeNumber,
}: PropertyOverviewSpecsProps) {
  const hideResidentialSpecs = shouldHideResidentialSpecsSection(propertyType);

  const specs = [
    {
      label: "Carpet Area",
      value: carpetArea ? `${carpetArea} ${areaUnit}` : null,
    },
    ...(hideResidentialSpecs
      ? []
      : [
          {
            label: "Bedrooms",
            value:
              bedrooms !== undefined && bedrooms !== null
                ? `${bedrooms} BHK`
                : null,
          },
          {
            label: "Bathrooms",
            value:
              bathrooms !== undefined && bathrooms !== null
                ? `${bathrooms} Baths`
                : null,
          },
          {
            label: "Balconies",
            value:
              balconies !== undefined && balconies !== null
                ? `${balconies}`
                : null,
          },
          { label: "Furnishing", value: furnishing || null },
        ]),
    { label: "Facing", value: facing ? `${facing} Facing` : null },
    {
      label: "Floor Elevation",
      value:
        floorNo !== undefined && totalFloors !== undefined
          ? `${floorNo} of ${totalFloors} Floors`
          : floorNo !== undefined
            ? `Floor ${floorNo}`
            : null,
    },
    { label: "Typology", value: propertyType || propertyCategory || null },
    {
      label: "Office Number",
      value: officeNumber || null,
      href: officeNumber ? `tel:${officeNumber.replace(/\s+/g, "")}` : undefined,
    },
  ].filter((s) => Boolean(s.value));

  return (
    <div className="border border-line bg-card-white">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-line">
        {specs.map((item: any, idx) => (
          <div key={idx} className="p-3.5 bg-card-white">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-ink block">
              {item.label}
            </span>
            {item.href ? (
              <a
                href={item.href}
                className="text-xs sm:text-sm font-bold text-ink hover:text-brass transition mt-0.5 block truncate"
                title={`Call ${item.value}`}
              >
                {item.value}
              </a>
            ) : (
              <span className="text-xs sm:text-sm font-bold text-ink mt-0.5 block truncate">
                {item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
