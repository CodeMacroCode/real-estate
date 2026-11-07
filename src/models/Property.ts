import mongoose, { Document, Model, Schema, Types } from "mongoose";
import "./Owner";
import "./Project";
import "./ProjectUnit";
import "./User";

export type PropertyCategory =
  | "Residential"
  | "Commercial"
  | "Land"
  | "Special Investment";

export type TransactionType = "Sale" | "Rent" | "Lease";

export type PropertyStatus =
  | "Available"
  | "Hold"
  | "Booked"
  | "Sold"
  | "Rented"
  | "Leased"
  | "Blocked"
  | "Archived";

export interface IPropertyDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  propertyId: string; // e.g. "PROP-2026-0001"
  title: string;
  propertyCategory: PropertyCategory;
  propertyType: string; // From MasterOption
  transactionType: TransactionType;
  listingType: "Direct" | "Exclusive" | "Open";
  status: PropertyStatus;

  // Interlinks
  ownerId: Types.ObjectId; // Ref: Owner (Mandatory)
  assignedEmployeeId?: Types.ObjectId; // Ref: User
  projectId?: Types.ObjectId; // Ref: Project (Optional)
  unitId?: Types.ObjectId; // Ref: ProjectUnit (Optional)

  // Pricing
  pricing: {
    price?: number;
    pricePerUnitArea?: number;
    isNegotiable: boolean;
    monthlyRent?: number;
    securityDeposit?: number;
    maintenanceCharges?: number;
    brokerageTerms?: string;
  };

  // Dimensions & Area
  areaDetails: {
    carpetArea?: number;
    builtUpArea?: number;
    superBuiltUpArea?: number;
    plotArea?: number;
    areaUnit: string; // "Sq. Ft.", "Sq. M.", "Acre", "Guntha", etc.
    frontage?: number;
    depth?: number;
    dimensions?: string;
  };

  // Location
  location: {
    address: string;
    landmark?: string;
    city: string;
    state?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
  };

  // Specific Category Specs
  residentialSpecs?: {
    bedrooms: number;
    bathrooms: number;
    balconies?: number;
    furnishing:
      | "Unfurnished"
      | "Semi-Furnished"
      | "Fully-Furnished"
      | "Semi Furnished"
      | "Fully Furnished"
      | "Furnished";
    facing?: string;
    floorNumber?: number;
    totalFloors?: number;
    parking?: string;
    ageOfProperty?: string;
    possessionStatus?: string;
  };

  commercialSpecs?: {
    ceilingHeight?: number;
    powerLoad?: string;
    washrooms?: number;
    lockInPeriodMonths?: number;
    currentTenant?: string;
  };

  plotSpecs?: {
    roadWidth?: number;
    cornerPlot?: boolean;
    gatedLayout?: boolean;
    naStatus?: string;
    surveyNumber?: string;
  };

  investmentSpecs?: {
    tenantCompany?: string;
    leaseStart?: Date;
    leaseEnd?: Date;
    currentMonthlyRent?: number;
    expectedAnnualRent?: number;
    grossYieldPercent?: number; // (Annual Rent / Price) * 100
    lockInPeriodMonths?: number;
  };

  amenities: string[];
  media: {
    featuredImage?: string;
    images: string[];
    videos?: string[];
    floorPlans?: string[];
    floorPlanMaps?: Array<{
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
    }>;
    documents?: string[];
  };

  // Website Publishing Rules
  publishing: {
    publishOnWebsite: boolean;
    featuredProperty: boolean;
    publishedAt?: Date;
    unpublishReason?: string;
    seo: {
      metaTitle?: string;
      metaDescription?: string;
      slug: string;
      canonicalUrl?: string;
    };
  };

  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IPropertyDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    propertyId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    propertyCategory: {
      type: String,
      enum: ["Residential", "Commercial", "Land", "Special Investment"],
      required: true,
      index: true,
    },
    propertyType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ["Sale", "Rent", "Lease"],
      required: true,
      index: true,
    },
    listingType: {
      type: String,
      enum: ["Direct", "Exclusive", "Open"],
      default: "Direct",
    },
    status: {
      type: String,
      enum: [
        "Available",
        "Hold",
        "Booked",
        "Sold",
        "Rented",
        "Leased",
        "Blocked",
        "Archived",
      ],
      default: "Available",
      index: true,
    },

    // Mandatory Owner Association
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
      index: true,
    },
    assignedEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: "ProjectUnit",
    },

    pricing: {
      price: { type: Number },
      pricePerUnitArea: { type: Number },
      isNegotiable: { type: Boolean, default: false },
      monthlyRent: { type: Number },
      securityDeposit: { type: Number },
      maintenanceCharges: { type: Number },
      brokerageTerms: { type: String, default: "" },
    },

    areaDetails: {
      carpetArea: { type: Number },
      builtUpArea: { type: Number },
      superBuiltUpArea: { type: Number },
      plotArea: { type: Number },
      areaUnit: { type: String, default: "Sq. Ft." },
      frontage: { type: Number },
      depth: { type: Number },
      dimensions: { type: String },
    },

    location: {
      address: { type: String, required: true },
      landmark: { type: String },
      city: { type: String, required: true, index: true },
      state: { type: String },
      pincode: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },

    residentialSpecs: {
      bedrooms: { type: Number },
      bathrooms: { type: Number },
      balconies: { type: Number },
      furnishing: {
        type: String,
        enum: [
          "Unfurnished",
          "Semi-Furnished",
          "Fully-Furnished",
          "Semi Furnished",
          "Fully Furnished",
          "Furnished",
        ],
      },
      facing: { type: String },
      floorNumber: { type: Number },
      totalFloors: { type: Number },
      parking: { type: String },
      ageOfProperty: { type: String },
      possessionStatus: { type: String },
    },

    commercialSpecs: {
      ceilingHeight: { type: Number },
      powerLoad: { type: String },
      washrooms: { type: Number },
      lockInPeriodMonths: { type: Number },
      currentTenant: { type: String },
    },

    plotSpecs: {
      roadWidth: { type: Number },
      cornerPlot: { type: Boolean },
      gatedLayout: { type: Boolean },
      naStatus: { type: String },
      surveyNumber: { type: String },
    },

    investmentSpecs: {
      tenantCompany: { type: String },
      leaseStart: { type: Date },
      leaseEnd: { type: Date },
      currentMonthlyRent: { type: Number },
      expectedAnnualRent: { type: Number },
      grossYieldPercent: { type: Number },
      lockInPeriodMonths: { type: Number },
    },

    amenities: [{ type: String, trim: true }],

    media: {
      featuredImage: { type: String },
      images: [{ type: String }],
      videos: [{ type: String }],
      floorPlans: [{ type: String }],
      floorPlanMaps: [
        {
          floorName: { type: String, required: true },
          floorNumber: { type: Number },
          planImageUrl: { type: String, required: true },
          hotspots: [
            {
              id: { type: String },
              xPercent: { type: Number, required: true },
              yPercent: { type: Number, required: true },
              title: { type: String, required: true },
              subtitle: { type: String },
              category: { type: String },
            },
          ],
        },
      ],
      documents: [{ type: String }],
    },

    publishing: {
      publishOnWebsite: { type: Boolean, default: false, index: true },
      featuredProperty: { type: Boolean, default: false, index: true },
      publishedAt: { type: Date },
      unpublishReason: { type: String },
      seo: {
        metaTitle: { type: String },
        metaDescription: { type: String },
        slug: { type: String, trim: true, lowercase: true },
        canonicalUrl: { type: String },
      },
    },

    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
PropertySchema.index({ adminId: 1, propertyId: 1 }, { unique: true });
PropertySchema.index({
  adminId: 1,
  "publishing.publishOnWebsite": 1,
  status: 1,
  transactionType: 1,
});
PropertySchema.index({ adminId: 1, "publishing.seo.slug": 1 });
PropertySchema.index({ ownerId: 1, status: 1 });

export const Property: Model<IPropertyDocument> =
  mongoose.models.Property ||
  mongoose.model<IPropertyDocument>("Property", PropertySchema);
