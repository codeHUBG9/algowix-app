import { test, expect } from "@playwright/test";
import { registerViaUi, uniqueEmail } from "./helpers";

test.describe("Inventory (Phase 25 §5)", () => {
  test("add an item, adjust stock, see it flip low-stock, then delete it", async ({ page }) => {
    await registerViaUi(page, { email: uniqueEmail("inventory-e2e"), organizationName: "Inventory E2E Org" });

    await page.goto("/dashboard/inventory");
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
    await expect(page.getByText("No inventory items yet")).toBeVisible();

    await page.getByRole("button", { name: "Add Item" }).first().click();
    const addDialog = page.getByRole("dialog");
    await addDialog.locator("#item-sku").fill("WIDGET-E2E-1");
    await addDialog.locator("#item-name").fill("E2E Widget");
    await addDialog.locator("#item-quantity").fill("5");
    await addDialog.locator("#item-reorder-point").fill("10");
    await addDialog.locator("#item-unit-cost").fill("3.5");
    await addDialog.locator("#item-unit-price").fill("9.99");
    await addDialog.getByRole("button", { name: "Create item" }).click();

    await expect(page.getByText("Item created")).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: "WIDGET-E2E-1" });
    await expect(row).toBeVisible();
    // 5 <= reorderPoint 10 — Qty cell is flagged red for low stock.
    await expect(row.getByText("5")).toBeVisible();

    await row.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("heading", { name: "E2E Widget" })).toBeVisible();
    await expect(page.getByText("(low stock)")).toBeVisible();

    // Quick adjustment: stock IN +10 -> quantity 15, no longer low stock.
    await page.getByRole("button", { name: "In", exact: true }).click();
    await page.locator("input[type='number']").fill("10");
    await page.getByRole("button", { name: "Record movement" }).click();
    await expect(page.getByText("Stock increased by 10")).toBeVisible();
    await expect(page.getByText("Added 10 units")).toBeVisible();
    await expect(page.getByText("(low stock)")).toHaveCount(0);

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await page.waitForURL("**/dashboard/inventory");
    await expect(page.getByText("No inventory items yet")).toBeVisible();
  });
});
