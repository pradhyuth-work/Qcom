import { NextRequest, NextResponse, connection } from "next/server";
import { buildBangaloreExport } from "@/lib/export-bangalore";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const orderId = Number(id);
  const buf = await buildBangaloreExport(orderId);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="BANGALORE MT DISPATCH ORDER FORMAT ALL WDs - order ${orderId}.xlsx"`,
    },
  });
}
