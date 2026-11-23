import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { StoredFile } from "@/models/StoredFile";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Allowed mime types & extensions: images (jpg, jpeg, png, webp, svg, gif, avif, bmp, tiff, heic, heif), pdf, doc, docx
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".svg",
  ".gif",
  ".avif",
  ".bmp",
  ".tiff",
  ".tif",
  ".heic",
  ".heif",
  ".pdf",
  ".doc",
  ".docx",
]);

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided in form data", 400);
    }

    const originalName = file.name || "document";
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return errorResponse(
        `Invalid file type (${ext}). Supported: JPG, JPEG, PNG, WEBP, SVG, GIF, PDF, DOC, DOCX`,
        400,
      );
    }

    // Limit size to 15MB for serverless database persistence
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return errorResponse("File size exceeds 15MB limit", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Try local disk write if possible (for local cache & fast access)
    let savedFileName = "";
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "invoices");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const safeBaseName = path
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 50);
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      savedFileName = `${safeBaseName}_${uniqueSuffix}${ext}`;
      const destinationPath = path.join(uploadsDir, savedFileName);

      fs.writeFileSync(destinationPath, buffer);
    } catch (localErr) {
      console.warn("Local disk write unavailable:", localErr);
    }

    // 2. ALWAYS persist to MongoDB StoredFile
    // This guarantees images and files are immediately accessible via /api/files/[id]
    // on all serverless, containerized, and standalone Next.js deployments without 404s.
    await connectToDatabase();
    const base64Data = buffer.toString("base64");
    const mime = file.type || "application/octet-stream";

    const storedDoc = await StoredFile.create({
      fileName: savedFileName || originalName,
      mimeType: mime,
      data: base64Data,
      size: file.size,
      uploadedById: authContext.user._id,
    });

    const fileUrl = `/api/files/${storedDoc._id.toString()}`;

    return jsonResponse({
      fileUrl,
      fileName: originalName,
      fileSize: file.size,
      mimeType: mime,
      extension: ext,
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return errorResponse(
      error.message || "Failed to upload file to server",
      500,
    );
  }
}
