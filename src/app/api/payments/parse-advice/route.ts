import { NextRequest, NextResponse, connection } from "next/server";
import { PDFParse } from "pdf-parse";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "path";
import { pathToFileURL } from "url";
import { parsePaymentAdviceText } from "@/lib/payment-advice";
import { getDefaultCustomer } from "@/lib/customers";
import db from "@/lib/db";

// Turbopack's bundling can't resolve pdf-parse's internal dynamic import for the pdfjs worker
// chunk ("fake worker" setup fails with a module-not-found error). Pointing GlobalWorkerOptions
// at the real file on disk sidesteps that bundler-path guessing -- the Node ESM loader needs a
// file:// URL, not a raw Windows path (pathToFileURL handles the `D:\...` -> `file:///D:/...`
// conversion that Node's dynamic import() requires).
GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

export async function POST(req: NextRequest) {
  await connection();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buf });
  let text: string;
  try {
    const result = await parser.getText();
    text = result.text;
  } finally {
    await parser.destroy();
  }

  const advice = parsePaymentAdviceText(text);
  if (advice.lines.length === 0) {
    return NextResponse.json(
      { error: "Could not find any invoice line items in this PDF — it may not be in the expected payment advice format." },
      { status: 400 }
    );
  }

  const customer = getDefaultCustomer();
  const rows = advice.lines.map((l) => {
    const onFile = db
      .prepare(`SELECT invoice_amount FROM outstanding WHERE customer_id = ? AND invoice_number = ?`)
      .get(customer.id, l.invoiceNo) as { invoice_amount: number } | undefined;
    const settlement = l.netAmount + l.tds;
    const amountMatches = onFile ? Math.abs(onFile.invoice_amount - settlement) < 1 : false;
    return {
      ...l,
      onFileAmount: onFile?.invoice_amount ?? null,
      found: !!onFile,
      amountMatches,
    };
  });

  return NextResponse.json({
    adviceReference: advice.adviceReference,
    valueDate: advice.valueDate,
    remitterName: advice.remitterName,
    rows,
  });
}
