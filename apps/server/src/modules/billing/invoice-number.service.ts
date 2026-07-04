import { prisma } from "../../database/prisma.js";

// 11-Billing.md §4 — Format: AWX-{YEAR}-{SEQUENTIAL_NUMBER}, global auto-increment,
// never reset. Backed by a single-row-per-year counter table (InvoiceSequence)
// updated inside a Serializable transaction, rather than scanning existing
// invoices for a max(), so concurrent checkouts can't collide on the same number.
export async function nextInvoiceNumber(date: Date = new Date()): Promise<string> {
  const year = date.getUTCFullYear();

  const lastNumber = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.invoiceSequence.findUnique({ where: { year } });
      if (!existing) {
        await tx.invoiceSequence.create({ data: { year, lastNumber: 1 } });
        return 1;
      }
      const updated = await tx.invoiceSequence.update({
        where: { year },
        data: { lastNumber: { increment: 1 } },
      });
      return updated.lastNumber;
    },
    { isolationLevel: "Serializable" }
  );

  return `AWX-${year}-${String(lastNumber).padStart(6, "0")}`;
}
