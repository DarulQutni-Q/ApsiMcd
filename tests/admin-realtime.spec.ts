import { test, expect } from '@playwright/test';

test('Admin Realtime Checks', async ({ page }) => {
  // Use real backend routes
  await page.goto('http://localhost:3000/admin');
  await page.fill('input[type="password"]', '999999');
  await page.click('button:has-text("Unlock Dashboard")');

  await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
  
  // Note the initial orders
  const ordersLoc = page.locator('p:has-text("Total Orders")').locator('xpath=following-sibling::h3');
  await expect(ordersLoc).toBeVisible({ timeout: 10000 });
  const ordersText = await ordersLoc.textContent();
  console.log("Initial orders:", ordersText);

  // We open a new page to checkout an order
  const context = page.context();
  const kioskPage = await context.newPage();
  
  await kioskPage.goto('http://localhost:3000/kiosk');
  // Wait for loading to finish
  const firstItem = kioskPage.locator('h3').first();
  await firstItem.waitFor({ state: 'visible', timeout: 10000 });
  await kioskPage.locator('button:has-text("ORDER NOW")').click();
  await kioskPage.click('button:has-text("Checkout")');
  await kioskPage.click('button:has-text("Place Order")');
  
  // Wait for success screen
  await kioskPage.waitForSelector('h2:has-text("Order Received!")', { timeout: 10000 });

  // Kitchen Page
  const kitchenPage = await context.newPage();
  await kitchenPage.goto('http://localhost:3000/kitchen');
  await kitchenPage.fill('input[type="password"]', '111111');
  await kitchenPage.click('button:has-text("Unlock Dashboard")');
  
  await kitchenPage.waitForSelector('button:has-text("Start Preparing")');
  await kitchenPage.click('button:has-text("Start Preparing")');
  await kitchenPage.waitForSelector('[class*="cursor-pointer"]');
  await kitchenPage.locator('[class*="cursor-pointer"]').first().click(); // check item
  await kitchenPage.waitForSelector('button:has-text("Complete & Send"):not([disabled])');
  await kitchenPage.click('button:has-text("Complete & Send")');

  // Cashier Page
  const cashierPage = await context.newPage();
  await cashierPage.goto('http://localhost:3000/cashier');
  await cashierPage.fill('input[type="password"]', '222222');
  await cashierPage.click('button:has-text("Unlock Dashboard")');
  
  await cashierPage.waitForSelector('button:has-text("QRIS")');
  await cashierPage.click('button:has-text("QRIS")');
  await cashierPage.click('button:has-text("Complete Transaction")');

  // Now back to admin page, it should auto update
  await page.bringToFront();
  
  // Wait for the state to update to at least Initial+1
  const expectedNew = parseInt(ordersText || '0') + 1;
  await expect(ordersLoc).not.toHaveText(ordersText, { timeout: 15000 }); // Wait until it changes
  
  const newOrdersText = await ordersLoc.textContent();
  console.log("New orders:", newOrdersText);
});
