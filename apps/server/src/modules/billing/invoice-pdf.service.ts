import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import { env } from "../../config/env.js";

// 11-Billing.md §4 — invoice PDF generation. The doc's sample renders a React
// template through headless Chromium (Puppeteer); this environment uses
// pdfkit instead (no ~300MB Chromium download, no browser to launch) — a
// deliberate deviation confirmed with the user up front, same category as
// swapping argon2 for @node-rs/argon2 elsewhere in this codebase. Written to
// local disk (INVOICE_STORAGE_DIR) instead of Azure Blob, since no Azure
// account exists here; billing.controller.ts streams the file back on
// download rather than returning a public blob URL.
interface InvoiceForPdf {
  id: string;
  invoiceNumber: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  isIGST: boolean;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  lineItems: { description: string; quantity: number; amount: string }[];
  organization: { name: string; billingEmail: string; taxId: string | null };
}

// Relative filename stored on Invoice.pdfUrl and joined with
// INVOICE_STORAGE_DIR on download — never an absolute disk path in the DB/API.
export function pdfFilename(invoiceId: string): string {
  return `${invoiceId}.pdf`;
}

export async function generateInvoicePdf(invoice: InvoiceForPdf): Promise<string> {
  await mkdir(env.INVOICE_STORAGE_DIR, { recursive: true });
  const filename = pdfFilename(invoice.id);
  const filePath = path.join(env.INVOICE_STORAGE_DIR, filename);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = createWriteStream(filePath);
    doc.pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.on("error", reject);

    doc.fontSize(20).text("AlgoWix", { continued: false });
    doc.fontSize(9).text(`GST: ${env.ALGOWIX_GST_NUMBER}`);
    doc.moveDown();

    doc.fontSize(16).text(`Invoice ${invoice.invoiceNumber}`);
    doc.fontSize(10);
    doc.text(`Billed to: ${invoice.organization.name} (${invoice.organization.billingEmail})`);
    if (invoice.organization.taxId) doc.text(`GSTIN: ${invoice.organization.taxId}`);
    doc.text(`Period: ${invoice.periodStart.toDateString()} - ${invoice.periodEnd.toDateString()}`);
    doc.text(`Due date: ${invoice.dueDate.toDateString()}`);
    doc.moveDown();

    doc.fontSize(11);
    for (const item of invoice.lineItems) {
      doc.text(`${item.description}  x${item.quantity}  ${invoice.currency} ${item.amount}`);
    }
    doc.moveDown();

    doc.text(`Subtotal: ${invoice.currency} ${invoice.subtotal}`);
    if (invoice.isIGST) {
      doc.text(`IGST (18%): ${invoice.currency} ${invoice.igstAmount}`);
    } else {
      doc.text(`CGST (9%): ${invoice.currency} ${invoice.cgstAmount}`);
      doc.text(`SGST (9%): ${invoice.currency} ${invoice.sgstAmount}`);
    }
    doc.fontSize(13).text(`Total: ${invoice.currency} ${invoice.total}`, { underline: true });

    doc.end();
  });

  return filename;
}
