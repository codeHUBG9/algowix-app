# AlgoWix Platform — 11 Billing

**Document Version:** 1.0.0  
**Status:** Approved

---

## Table of Contents

1. [Billing Architecture](#1-billing-architecture)
2. [Payment Gateways](#2-payment-gateways)
3. [Checkout Flow](#3-checkout-flow)
4. [Invoice Generation](#4-invoice-generation)
5. [GST & Tax Handling](#5-gst--tax-handling)
6. [Dunning Management](#6-dunning-management)
7. [Refunds & Credits](#7-refunds--credits)
8. [Billing Webhooks from Gateway](#8-billing-webhooks-from-gateway)
9. [Audit Trail for Billing](#9-audit-trail-for-billing)
10. [Billing API Reference](#10-billing-api-reference)

---

## 1. Billing Architecture

```
Customer Action (upgrade, subscribe)
         │
         ▼
Subscription Service (creates/modifies subscription)
         │
         ▼
Billing Service (calculate amount, create invoice)
         │
         ▼
Payment Gateway (Razorpay/Stripe)
         │
    ┌────┴────┐
  Success   Failure
    │           │
    ▼           ▼
Update Invoice  Dunning Flow
Mark PAID       (retry sequence)
Send Receipt    Send Warning
Notify Notif    Notify
Service         Service
```

### Key Billing Entities

```
Invoice (1) → InvoiceLineItems (many)
Invoice (1) → Payments (many)
Organization (1) → PaymentMethods (many, one default)
Organization (1) → Invoices (many)
Subscription (1) → UsageRecords (many)
```

---

## 2. Payment Gateways

### Primary: Razorpay (India)

Used for:
- Indian customers (INR payments)
- UPI, Net Banking, Credit/Debit Cards (India)
- Auto-debit for subscriptions (Razorpay Subscriptions)

```typescript
// Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order
const order = await razorpay.orders.create({
  amount: totalAmountInPaise,      // ₹999 = 99900 paise
  currency: 'INR',
  receipt: `inv_${invoiceId}`,
  notes: { organizationId, invoiceId }
});
```

### Secondary: Stripe (International)

Used for:
- International customers (USD, EUR, GBP)
- Credit/debit cards globally
- SEPA, ACH bank transfers

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});
```

### Gateway Selection Logic

```typescript
function selectPaymentGateway(organization: Organization): 'razorpay' | 'stripe' {
  return organization.country === 'IN' ? 'razorpay' : 'stripe';
}
```

---

## 3. Checkout Flow

### New Subscription Checkout

```
POST /api/v1/billing/checkout
Body: { productSlug, planSlug, billingCycle, couponCode? }

1. Validate subscription doesn't already exist
2. Calculate pricing:
   a. Base plan price
   b. Apply coupon discount
   c. Calculate GST/VAT
   d. Final total
3. Create Order in payment gateway
4. Return checkout session:
   {
     orderId: "razorpay_order_id",
     amount: 118000,           // ₹1,180 in paise (including 18% GST)
     currency: "INR",
     key: "rzp_live_xxx",     // Razorpay key for frontend
     prefill: { email, name, contact }
   }

Frontend:
5. Open Razorpay payment modal
6. Customer completes payment
7. Razorpay calls webhook: /webhooks/razorpay

Server (webhook handler):
8. Verify Razorpay webhook signature
9. Find invoice by orderId
10. Update Invoice.status = PAID
11. Activate subscription
12. Provision product tenant (if new subscription)
13. Generate invoice PDF (async)
14. Send receipt email
15. Update audit log
```

### Upgrade/Downgrade

```
POST /api/v1/subscriptions/:id/upgrade
Body: { newPlanSlug }

Proration calculation:
- Days remaining in current period: daysLeft
- Credit = (currentPlanDailyRate × daysLeft)
- New charge = newPlanMonthlyPrice - credit

Immediate effect:
- Subscription plan updated immediately
- Pro-rated invoice generated
- Difference charged or credited
```

---

## 4. Invoice Generation

### Invoice Numbering

```
Format: AWX-{YEAR}-{SEQUENTIAL_NUMBER}
Example: AWX-2025-000001

Sequence: Global auto-increment
Reset: Never (to maintain uniqueness)
```

### Invoice PDF Generation

PDFs are generated asynchronously after payment confirmation:

```typescript
// jobs/invoice-pdf.job.ts
import puppeteer from 'puppeteer';

async function generateInvoicePdf(invoiceId: string): Promise<string> {
  const invoice = await invoiceRepository.findWithDetails(invoiceId);
  
  // Render invoice HTML using React template
  const html = renderToString(<InvoiceTemplate invoice={invoice} />);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
  });
  
  await browser.close();
  
  // Upload to Azure Blob
  const blobUrl = await storageService.uploadBuffer(
    `invoices/${invoice.id}.pdf`,
    pdfBuffer,
    'application/pdf'
  );
  
  await invoiceRepository.updatePdfUrl(invoiceId, blobUrl);
  return blobUrl;
}
```

---

## 5. GST & Tax Handling

### GST Rules (India)

```
B2B (Organization has GST number): Invoice shows GST (Reverse Charge applicable for some)
B2C (No GST number): GST included in price

GST Rate: 18% on SaaS services

IGST: Applied when supplier (AlgoWix) and customer are in different states
CGST + SGST: Applied when supplier and customer are in same state (Maharashtra)

AlgoWix GST Details:
- GST Number: stored in Platform settings
- Place of Supply: Maharashtra, India (for intra-state)
```

### Tax Calculation

```typescript
interface TaxCalculation {
  subtotal: number;
  isIGST: boolean;          // Different state = IGST
  igst?: number;            // 18% if different state
  cgst?: number;            // 9% if same state
  sgst?: number;            // 9% if same state
  totalTax: number;
  total: number;
}

function calculateGST(subtotal: number, customerState: string): TaxCalculation {
  const ALGOWIX_STATE = 'MH'; // Maharashtra
  const GST_RATE = 0.18;
  const HALF_GST = 0.09;

  if (customerState !== ALGOWIX_STATE) {
    const igst = subtotal * GST_RATE;
    return { subtotal, isIGST: true, igst, totalTax: igst, total: subtotal + igst };
  } else {
    const cgst = subtotal * HALF_GST;
    const sgst = subtotal * HALF_GST;
    return { subtotal, isIGST: false, cgst, sgst, totalTax: cgst + sgst, total: subtotal + cgst + sgst };
  }
}
```

---

## 6. Dunning Management

The dunning system handles failed payment recovery:

```typescript
// Dunning schedule
const DUNNING_SCHEDULE = [
  { dayAfterFailure: 0,  action: 'notify_email',    severity: 'info' },
  { dayAfterFailure: 3,  action: 'retry_payment',   severity: 'warning' },
  { dayAfterFailure: 7,  action: 'retry_payment',   severity: 'warning' },
  { dayAfterFailure: 14, action: 'retry_and_limit', severity: 'critical' },   // Read-only mode
  { dayAfterFailure: 21, action: 'retry_payment',   severity: 'critical' },
  { dayAfterFailure: 30, action: 'suspend',         severity: 'critical' },
];

// Daily job: checks for subscriptions in PAST_DUE status
async function runDunningJob() {
  const pastDueSubscriptions = await subscriptionRepo.findPastDue();
  
  for (const sub of pastDueSubscriptions) {
    const daysSinceFailure = differenceInDays(new Date(), sub.paymentFailedAt);
    const action = DUNNING_SCHEDULE.find(d => d.dayAfterFailure === daysSinceFailure);
    
    if (action) {
      await executeDunningAction(sub, action);
    }
  }
}
```

---

## 7. Refunds & Credits

### Refund Policy

- Full refund: within 7 days of payment, if no usage
- Partial refund: prorated based on unused days
- No refund: after 7 days (configurable by plan)

### Credit Notes

```typescript
// Credits reduce next invoice amount
async function issueCredit(organizationId: string, amount: number, reason: string) {
  await billingRepository.createCredit({
    organizationId,
    amount,
    reason,
    expiresAt: addMonths(new Date(), 12),  // Credits expire in 1 year
  });
}
```

---

## 8. Billing Webhooks from Gateway

```typescript
// webhooks/razorpay.handler.ts
export async function handleRazorpayWebhook(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { event, payload } = req.body;

  switch (event) {
    case 'payment.captured':
      await billingService.handlePaymentSuccess(payload.payment.entity);
      break;
    case 'payment.failed':
      await billingService.handlePaymentFailure(payload.payment.entity);
      break;
    case 'subscription.charged':
      await billingService.handleSubscriptionCharged(payload.subscription.entity);
      break;
  }

  res.json({ received: true });
}
```

---

## 9. Audit Trail for Billing

All billing events are logged with `CRITICAL` severity in the audit log:

```
Events logged:
- subscription.created
- subscription.upgraded
- subscription.downgraded
- subscription.cancelled
- subscription.suspended
- invoice.created
- invoice.paid
- invoice.voided
- payment.succeeded
- payment.failed
- payment.refunded
- payment_method.added
- payment_method.removed
- coupon.applied
```

---

## 10. Billing API Reference

```
GET    /api/v1/billing/invoices              → List invoices
GET    /api/v1/billing/invoices/:id          → Get invoice
GET    /api/v1/billing/invoices/:id/download → Download PDF
POST   /api/v1/billing/checkout             → Start checkout
GET    /api/v1/billing/payment-methods       → List payment methods
POST   /api/v1/billing/payment-methods       → Add payment method
DELETE /api/v1/billing/payment-methods/:id   → Remove payment method
PATCH  /api/v1/billing/payment-methods/:id/default → Set default
GET    /api/v1/billing/usage                → Current usage summary
GET    /api/v1/billing/upcoming             → Next invoice preview
POST   /api/v1/billing/coupon/validate      → Validate coupon code
```

---

*Next: [12-Subscriptions.md — Subscription Lifecycle, Feature Gating, Trial Management]*

---
**Document Control**  
Owner: Platform Architect + Finance
