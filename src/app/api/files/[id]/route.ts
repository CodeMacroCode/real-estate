import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import { StoredFile } from "@/models/StoredFile";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse("File ID required", { status: 400 });
    }

    await connectToDatabase();
    let stored = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      stored = await StoredFile.findById(id).lean();
    }
    if (!stored) {
      stored = await StoredFile.findOne({ fileName: id }).lean();
    }

    if (!stored) {
      // Check local disk fallback in public/uploads/invoices or public/uploads
      const diskPaths = [
        path.join(process.cwd(), "public", "uploads", "invoices", id),
        path.join(process.cwd(), "public", "uploads", id),
      ];
      for (const p of diskPaths) {
        if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
          const buffer = fs.readFileSync(/*turbopackIgnore: true*/ p);
          const ext = path.extname(p).toLowerCase();
          const mime = MIME_TYPES[ext] || "application/octet-stream";
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": mime,
              "Content-Length": buffer.length.toString(),
              "Cache-Control": "public, max-age=31536000, immutable",
              "Content-Disposition": `inline; filename="${id}"`,
            },
          });
        }
      }
      return new NextResponse("File not found", { status: 404 });
    }

    // Convert stored base64 string back into binary buffer
    const base64Data = stored.data.includes(";base64,")
      ? stored.data.split(";base64,")[1]
      : stored.data;
    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": stored.mimeType || "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${stored.fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/files/[id] error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
