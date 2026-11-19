import React from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { SocialConnectedAccount } from "@/models/SocialPublisher";
import { ContentSocialMediaClient } from "./ContentSocialMediaClient";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Social Media Content Hub | Real Estate CRM",
  description: "Connect channels, schedule property walkthrough videos, and publish across social media networks.",
};

export default async function ContentSocialMediaPage() {
  const authContext = await getServerAuthContext();
  if (!authContext) {
    redirect("/login");
  }

  await connectToDatabase();

  const isSuperAdmin = authContext.role?.slug === "super_admin";
  const isAdmin = authContext.role?.slug === "admin";

  let targetAdminId: mongoose.Types.ObjectId;
  if (isSuperAdmin || isAdmin) {
    targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
  } else {
    const parentId = authContext.user.parentAdminId;
    targetAdminId = new mongoose.Types.ObjectId(
      typeof parentId === "object" && parentId ? (parentId as any)._id : parentId || authContext.user._id
    );
  }

  // Pre-load linked accounts
  const rawAccounts = await SocialConnectedAccount.find({
    adminId: targetAdminId,
    isActive: true,
  })
    .select("-accessToken -refreshToken")
    .sort({ createdAt: -1 })
    .lean();

  const initialAccounts = rawAccounts.map((a: any) => ({
    _id: a._id.toString(),
    platform: a.platform,
    accountType: a.accountType,
    accountId: a.accountId,
    accountName: a.accountName,
    accountAvatar: a.accountAvatar || "",
    accountHandle: a.accountHandle || "",
    isActive: a.isActive,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
  }));

  return (
    <ContentSocialMediaClient
      initialAccounts={JSON.parse(JSON.stringify(initialAccounts))}
      currentUser={{
        _id: String(authContext.user._id),
        name: String(authContext.user.name || ""),
        roleSlug: String(authContext.role?.slug || "admin"),
      }}
    />
  );
}
