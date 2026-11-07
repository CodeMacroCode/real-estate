import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import { StoredFile } from "@/models/StoredFile";

export const dynamic = "force-dynamic";

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
    const stored = await StoredFile.findById(id).lean();

    if (!stored) {
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
