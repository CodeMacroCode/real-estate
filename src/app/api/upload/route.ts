import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
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

    // Limit size to 25MB
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return errorResponse("File size exceeds 25MB limit", 400);
    }

    // Ensure storage directory exists
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "invoices",
    );
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate safe unique filename
    const safeBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const savedFileName = `${safeBaseName}_${uniqueSuffix}${ext}`;
    const destinationPath = path.join(uploadsDir, savedFileName);

    // Read bytes directly from file stream and write to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destinationPath, buffer);

    // Public URL served by Next.js from public directory
    const fileUrl = `/uploads/invoices/${savedFileName}`;

    return jsonResponse({
      fileUrl,
      fileName: originalName,
      fileSize: file.size,
      mimeType: file.type,
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
