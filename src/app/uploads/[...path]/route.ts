import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb/db";
import { StoredFile } from "@/models/StoredFile";

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
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("File path required", { status: 400 });
    }

    const relativePath = pathSegments.join("/");
    // Prevent directory traversal
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");

    // 1. Try serving from local disk (public/uploads/...)
    const baseUploadsDir = path.join(process.cwd(), "public", "uploads");
    const fullDiskPath = path.join(baseUploadsDir, safePath);

    if (fullDiskPath.startsWith(baseUploadsDir) && fs.existsSync(/*turbopackIgnore: true*/ fullDiskPath)) {
      const stat = fs.statSync(/*turbopackIgnore: true*/ fullDiskPath);
      if (stat.isFile()) {
        const buffer = fs.readFileSync(/*turbopackIgnore: true*/ fullDiskPath);
        const ext = path.extname(fullDiskPath).toLowerCase();
        const mime = MIME_TYPES[ext] || "application/octet-stream";
        const fileName = path.basename(fullDiskPath);

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mime,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Disposition": `inline; filename="${fileName}"`,
          },
        });
      }
    }

    // 2. Fallback: Search in MongoDB StoredFile by filename
    const targetFileName = pathSegments[pathSegments.length - 1];
    if (targetFileName) {
      await connectToDatabase();
      const stored = await StoredFile.findOne({
        $or: [
          { fileName: targetFileName },
          { fileName: { $regex: targetFileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        ],
      }).lean();

      if (stored) {
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
      }
    }

    return new NextResponse("File not found", { status: 404 });
  } catch (err: any) {
    console.error("GET /uploads/[...path] error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
