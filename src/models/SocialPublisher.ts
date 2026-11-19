import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Supported Social Media Platforms for Media Content Publishing
 */
export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "twitter"
  | "threads"
  | "linkedin"
  | "youtube"
  | "googleBusiness"
  | "telegram";

/**
 * Account sub-types (e.g. Page vs Profile vs Group vs Channel)
 */
export type SocialAccountType =
  | "profile"
  | "page"
  | "group"
  | "location"
  | "business"
  | "channel";

/**
 * Interface representing a linked social media account
 */
export interface ISocialConnectedAccountDocument extends Document {
  adminId: Types.ObjectId; // Multi-tenant scoping to Agency Admin
  userId: Types.ObjectId;  // Staff/User who connected the channel
  platform: SocialPlatform;
  accountType: SocialAccountType;
  accountId: string;       // Remote platform ID (Page ID, Channel ID, Handle, Chat ID)
  accountName: string;     // Display label (e.g., "Prestige Properties Official")
  accountAvatar?: string;  // Profile picture / Logo URL
  accountHandle?: string;  // @username or link
  accessToken: string;     // Publishing OAuth token or Bot token
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: Record<string, any>; // Extra platform data (e.g. telegram chat_id, GBP locationId)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SocialConnectedAccountSchema = new Schema<ISocialConnectedAccountDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: [
        "facebook",
        "instagram",
        "twitter",
        "threads",
        "linkedin",
        "youtube",
        "googleBusiness",
        "telegram",
      ],
      required: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: ["profile", "page", "group", "location", "business", "channel"],
      default: "page",
    },
    accountId: {
      type: String,
      required: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accountAvatar: {
      type: String,
      trim: true,
    },
    accountHandle: {
      type: String,
      trim: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
    tokenExpiresAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one unique channel link per platform & admin
SocialConnectedAccountSchema.index(
  { adminId: 1, platform: 1, accountId: 1 },
  { unique: true }
);

/**
 * Post publication status lifecycle
 */
export type SocialPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type SocialMediaType = "none" | "image" | "video" | "carousel";

export interface ISocialPublishResult {
  accountId: Types.ObjectId;
  platform: SocialPlatform;
  status: "success" | "failed";
  externalPostId?: string;
  externalPostUrl?: string;
  errorMessage?: string;
  executedAt: Date;
}

/**
 * Interface representing a scheduled or published media post
 */
export interface ISocialScheduledPostDocument extends Document {
  adminId: Types.ObjectId;
  userId: Types.ObjectId;
  caption: string;
  mediaUrls: string[];
  mediaType: SocialMediaType;
  targetAccounts: Types.ObjectId[]; // References SocialConnectedAccount
  scheduledAt: Date;
  publishedAt?: Date;
  status: SocialPostStatus;
  publishResults: ISocialPublishResult[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SocialScheduledPostSchema = new Schema<ISocialScheduledPostDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    caption: {
      type: String,
      required: true,
      trim: true,
    },
    mediaUrls: [
      {
        type: String,
        trim: true,
      },
    ],
    mediaType: {
      type: String,
      enum: ["none", "image", "video", "carousel"],
      default: "none",
    },
    targetAccounts: [
      {
        type: Schema.Types.ObjectId,
        ref: "SocialConnectedAccount",
        required: true,
      },
    ],
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "publishing", "published", "failed"],
      default: "draft",
      index: true,
    },
    publishResults: [
      {
        accountId: { type: Schema.Types.ObjectId, ref: "SocialConnectedAccount" },
        platform: { type: String },
        status: { type: String, enum: ["success", "failed"] },
        externalPostId: { type: String },
        externalPostUrl: { type: String },
        errorMessage: { type: String },
        executedAt: { type: Date, default: Date.now },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for background cron dispatcher efficiency
SocialScheduledPostSchema.index({ status: 1, scheduledAt: 1 });
SocialScheduledPostSchema.index({ adminId: 1, scheduledAt: 1, status: 1 });

export const SocialConnectedAccount: Model<ISocialConnectedAccountDocument> =
  mongoose.models.SocialConnectedAccount ||
  mongoose.model<ISocialConnectedAccountDocument>(
    "SocialConnectedAccount",
    SocialConnectedAccountSchema
  );

export const SocialScheduledPost: Model<ISocialScheduledPostDocument> =
  mongoose.models.SocialScheduledPost ||
  mongoose.model<ISocialScheduledPostDocument>(
    "SocialScheduledPost",
    SocialScheduledPostSchema
  );
