import { test, expect } from '@playwright/test';

test('Admin Dashboard Visuals & Charts', async ({ page }) => {
  // Mock the Supabase fetch calls to return fake data
  await page.route('**/rest/v1/orders*', async route => {
    const json = [
      { id: '1', order_number: 101, created_at: new Date().toISOString(), total_price: 150000, status: 'completed' },
      { id: '2', order_number: 102, created_at: new Date(Date.now() - 86400000).toISOString(), total_price: 85000, status: 'completed' },
    ];
    await route.fulfill({ json });
  });

  await page.route('**/rest/v1/order_items*', async route => {
    const json = [
      { qty: 2, menus: { name: 'Signature Double Burger', category: 'Burgers' }, orders: { status: 'completed' } },
      { qty: 1, menus: { name: 'Salted French Fries (Large)', category: 'Sides' }, orders: { status: 'completed' } },
      { qty: 3, menus: { name: 'Iced Coca-Cola (Medium)', category: 'Beverages' }, orders: { status: 'completed' } },
    ];
    await route.fulfill({ json });
  });
  
  await page.route('**/api/auth/verify-pin', async route => {
    return route.fulfill({ json: { success: true } });
  });

  await page.goto('http://localhost:3000/admin');
  
  await page.fill('input[type="password"]', '999999');
  await page.click('button:has-text("Unlock Dashboard")');

  await expect(page.locator("h1:has-text(\"Admin Dashboard\")")).toBeVisible();
  await expect(page.locator('text=Total Revenue')).toBeVisible();
  await expect(page.locator('text=Items Sold')).toBeVisible();
  await expect(page.locator('text=Revenue Trends')).toBeVisible();
  await expect(page.locator('text=Top Selling Items')).toBeVisible();
});
