export interface PropertyFloorPlanItem {
  floorName: string;
  floorNumber?: number;
  planImageUrl: string;
  hotspots?: Array<{
    id?: string;
    xPercent: number;
    yPercent: number;
    title: string;
    subtitle?: string;
    category?: string;
  }>;
}

export interface PropertyFormValues {
  title: string;
  propertyCategory: string;
  propertyType: string;
  transactionType: string;
  status: string;
  ownerId: string;
  city: string;
  address: string;
  googleMapsEmbedUrl: string;
  price: number;
  monthlyRent: number;
  carpetArea: number;
  areaUnit: string;
  bedrooms: number;
  bathrooms: number;
  furnishing: string;
  amenities: string[];
  publishOnWebsite: boolean;
}

export interface SelectOptionLike {
  value: string;
  label: string;
}

export const DEFAULT_PROPERTY_FORM_DATA: PropertyFormValues = {
  title: "",
  propertyCategory: "Residential",
  propertyType: "apartment",
  transactionType: "Sale",
  status: "Available",
  ownerId: "",
  city: "Bengaluru",
  address: "",
  googleMapsEmbedUrl: "",
  price: 9500000,
  monthlyRent: 0,
  carpetArea: 1250,
  areaUnit: "Sq. Ft.",
  bedrooms: 3,
  bathrooms: 2,
  furnishing: "Unfurnished",
  amenities: [],
  publishOnWebsite: true,
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const NON_RESIDENTIAL_PROPERTY_TYPE_SLUGS = new Set([
  "commercial_office",
  "office_space",
  "retail_shop",
  "retail_shop_showroom",
  "showroom",
  "warehouse",
  "warehouse_godown",
  "godown",
  "industrial_property",
  "industrial",
  "commercial_land",
  "agricultural_land",
  "agricultural_land_farm",
  "agriculture_land",
  "agriculture_land_farm",
  "farm_land",
  "farm",
  "na_plot",
  "pre_leased_commercial",
  "pre_leased",
  "income_generating_property",
  "income_generating",
]);

/**
 * Returns true for commercial, industrial, warehouse, land/NA plot, and
 * investment property types that should not collect or display Furnishing,
 * Bedrooms/BHK, Bathrooms, or residential Property Amenities.
 */
export function shouldHideResidentialSpecsSection(
  propertyType?: string | null,
): boolean {
  if (!propertyType || typeof propertyType !== "string") return false;
  const slug = propertyType
    .trim()
    .toLowerCase()
    .replace(/[\s/&-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (NON_RESIDENTIAL_PROPERTY_TYPE_SLUGS.has(slug)) {
    return true;
  }

  return (
    slug.includes("commercial_office") ||
    slug.includes("retail_shop") ||
    slug.includes("showroom") ||
    slug.includes("warehouse") ||
    slug.includes("godown") ||
    slug.includes("industrial") ||
    slug.includes("commercial_land") ||
    slug.includes("agricultur") ||
    slug === "na_plot" ||
    slug.includes("pre_leased") ||
    slug.includes("income_generat")
  );
}

/**
 * Matches a stored furnishing or master value against active SelectOptions,
 * tolerating case and hyphen/space differences (e.g. "Semi-Furnished" vs "Semi Furnished").
 */
export function resolveMatchingSelectValue(
  rawValue: string | undefined | null,
  options: SelectOptionLike[],
  fallback: string,
): string {
  const trimmed = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!trimmed) return fallback;

  const exact = options.find((opt) => opt.value === trimmed);
  if (exact) return exact.value;

  const byLabel = options.find(
    (opt) => opt.label.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (byLabel) return byLabel.value;

  const targetNorm = normalizeToken(trimmed);
  const byNorm = options.find(
    (opt) =>
      normalizeToken(opt.value) === targetNorm ||
      normalizeToken(opt.label) === targetNorm,
  );
  return byNorm ? byNorm.value : trimmed;
}

/** Checks whether an amenity label is currently selected (case & whitespace insensitive). */
export function isAmenitySelected(
  selected: string[],
  candidateLabel: string,
): boolean {
  const target = candidateLabel.trim().toLowerCase();
  if (!target) return false;
  return selected.some((item) => item.trim().toLowerCase() === target);
}

/** Adds or removes an amenity label without leaving case-variant duplicates behind. */
export function toggleAmenitySelection(
  selected: string[],
  candidateLabel: string,
): string[] {
  const target = candidateLabel.trim().toLowerCase();
  if (!target) return selected;

  if (isAmenitySelected(selected, candidateLabel)) {
    return selected.filter((item) => item.trim().toLowerCase() !== target);
  }
  return [...selected, candidateLabel.trim()];
}

/** Returns any already-saved amenities not present in the currently rendered master chips. */
export function getExtraSavedAmenities(
  selected: string[],
  visibleOptionLabels: string[],
): string[] {
  const visibleSet = new Set(
    visibleOptionLabels.map((label) => label.trim().toLowerCase()),
  );
  return selected.filter((item) => {
    const norm = item.trim().toLowerCase();
    return Boolean(norm) && !visibleSet.has(norm);
  });
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Extracts normalized Edit modal form values from either an SSR table item
 * or a full document returned by GET /api/properties/[id].
 */
export function extractPropertyFormState(
  raw: Record<string, any>,
  furnishingOptions: SelectOptionLike[] = [],
): {
  formData: PropertyFormValues;
  selectedOwnerLabel: string;
  existingImages: string[];
  floorPlans: PropertyFloorPlanItem[];
} {
  const ownerObj =
    raw.owner && typeof raw.owner === "object"
      ? raw.owner
      : raw.ownerId && typeof raw.ownerId === "object"
        ? raw.ownerId
        : null;

  const ownerId =
    ownerObj?._id != null
      ? String(ownerObj._id)
      : typeof raw.ownerId === "string"
        ? raw.ownerId
        : "";

  const selectedOwnerLabel = ownerObj?.name
    ? `${ownerObj.name} (${ownerObj.mobile || ""})`
    : "";

  const rawBedrooms = raw.residentialSpecs?.bedrooms ?? raw.bedrooms;
  const rawBathrooms = raw.residentialSpecs?.bathrooms ?? raw.bathrooms;
  const rawFurnishing =
    raw.residentialSpecs?.furnishing ?? raw.furnishing ?? "Unfurnished";

  const rawAmenities: string[] = Array.isArray(raw.amenities)
    ? Array.from(
        new Set(
          raw.amenities
            .filter((item: unknown): item is string => typeof item === "string")
            .map((item: string) => item.trim())
            .filter(Boolean),
        ),
      )
    : [];

  const formData: PropertyFormValues = {
    title: typeof raw.title === "string" ? raw.title : "",
    propertyCategory: raw.propertyCategory || "Residential",
    propertyType: raw.propertyType || "apartment",
    transactionType: raw.transactionType || "Sale",
    status: raw.status || "Available",
    ownerId,
    city: raw.location?.city || "Bengaluru",
    address: raw.location?.address || "",
    googleMapsEmbedUrl: raw.location?.googleMapsEmbedUrl || "",
    price: toFiniteNumber(raw.pricing?.price, 0),
    monthlyRent: toFiniteNumber(raw.pricing?.monthlyRent, 0),
    carpetArea: toFiniteNumber(raw.areaDetails?.carpetArea, 0),
    areaUnit: raw.areaDetails?.areaUnit || "Sq. Ft.",
    bedrooms: toFiniteNumber(rawBedrooms, 0),
    bathrooms: toFiniteNumber(rawBathrooms, 0),
    furnishing: resolveMatchingSelectValue(
      rawFurnishing,
      furnishingOptions,
      "Unfurnished",
    ),
    amenities: rawAmenities,
    publishOnWebsite: Boolean(raw.publishing?.publishOnWebsite),
  };

  return {
    formData,
    selectedOwnerLabel,
    existingImages: Array.isArray(raw.media?.images) ? raw.media.images : [],
    floorPlans: Array.isArray(raw.media?.floorPlanMaps)
      ? raw.media.floorPlanMaps
      : [],
  };
}
