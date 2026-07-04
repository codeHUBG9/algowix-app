export function suggestedPromptsForPath(pathname: string): string[] {
  if (pathname.startsWith("/dashboard/billing")) {
    return ["Explain my current invoice", "Which plan has the best value?", "How do I apply a coupon?"];
  }
  if (pathname.startsWith("/dashboard/rbac") || pathname.startsWith("/dashboard/members")) {
    return ["What permissions does the Manager role have?", "How do I restrict product access?"];
  }
  if (pathname.startsWith("/dashboard/reports")) {
    return ["Summarize last month's revenue", "Which org has the most API usage?"];
  }
  if (pathname.startsWith("/dashboard/inventory")) {
    return ["Show low stock items", "What's the reorder policy?"];
  }
  if (pathname.startsWith("/dashboard/crm")) {
    return ["Upcoming follow-ups this week", "Deals closing soon"];
  }
  if (pathname.startsWith("/dashboard/hrms")) {
    return ["Pending leave requests", "Headcount by department"];
  }
  return ["What can you help me with?", "Give me a tour of this page", "What's new on AlgoWix?"];
}
