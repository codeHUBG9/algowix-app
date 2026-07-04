import { env } from "../../config/env.js";

// 11-Billing.md §5 — GST calculation. IGST when the customer's state differs
// from AlgoWix's own registered state (ALGOWIX_STATE), CGST+SGST when it
// matches. The doc's B2B/B2C distinction only changes invoice *presentation*
// (whether GSTIN is shown), not the tax math, so it isn't modeled here.
export interface TaxCalculation {
  subtotal: number;
  isIGST: boolean;
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  total: number;
}

const GST_RATE = 0.18;
const HALF_GST = 0.09;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateGST(subtotal: number, customerState: string | null): TaxCalculation {
  const isIGST = !customerState || customerState.trim().toUpperCase() !== env.ALGOWIX_STATE.toUpperCase();

  if (isIGST) {
    const igst = round2(subtotal * GST_RATE);
    return { subtotal, isIGST: true, igst, cgst: 0, sgst: 0, totalTax: igst, total: round2(subtotal + igst) };
  }

  const cgst = round2(subtotal * HALF_GST);
  const sgst = round2(subtotal * HALF_GST);
  return { subtotal, isIGST: false, igst: 0, cgst, sgst, totalTax: round2(cgst + sgst), total: round2(subtotal + cgst + sgst) };
}
