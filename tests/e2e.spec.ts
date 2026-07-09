import { test, expect } from '@playwright/test';

test.describe('Drive-Thru System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Supabase fetch calls to return fake data
    await page.route('**/rest/v1/menus*', async route => {
      const json = [
        { id: 'f1', name: 'Signature Double Burger', category: 'Food', price: 45000, is_active: true, image_url: '' },
        { id: 'f2', name: 'Crispy Chicken Nuggets (6 pc)', category: 'Food', price: 25000, is_active: true, image_url: '' }
      ];
      await route.fulfill({ json });
    });

    await page.route('**/rest/v1/promos*', async route => {
      const json = { id: 'promo-1', name: 'Weekend Special', discount_percent: 10, is_active: true };
      await route.fulfill({ json });
    });
    
    // Mock auth verification
    await page.route('**/api/auth/verify-pin', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const payload = JSON.parse(request.postData() || '{}');
        if ((payload.role === 'kitchen' && payload.passcode === '111111') || 
            (payload.role === 'cashier' && payload.passcode === '222222')) {
          return route.fulfill({ json: { success: true } });
        }
        return route.fulfill({ status: 401, json: { error: 'Invalid PIN' } });
      }
    });
  });

  test('Happy Path: Kiosk -> Kitchen -> Cashier', async ({ page }) => {
    await page.goto('http://localhost:3000/kiosk');
    await page.waitForTimeout(3000);
    
    await page.locator('button:has-text("ORDER NOW")').click();

    const checkoutButton = page.locator('button:has-text("Checkout")');
    await expect(checkoutButton).toBeEnabled();
    
    await page.goto('http://localhost:3000/kitchen');
    await page.fill('input[type="password"]', '111111');
    await page.click('button:has-text("Unlock Dashboard")');
    await expect(page.locator('h1:has-text("Kitchen Task Board")')).toBeVisible();

    await page.goto('http://localhost:3000/cashier');
    await page.fill('input[type="password"]', '222222');
    await page.click('button:has-text("Unlock Dashboard")');
    await expect(page.locator('h1:has-text("Cashier Register")')).toBeVisible();
  });

  test('Negative Case: Empty Cart Checkout Blocked', async ({ page }) => {
    await page.goto('http://localhost:3000/kiosk');
    const checkoutButton = page.locator('button:has-text("Checkout")');
    await expect(checkoutButton).toBeDisabled();
  });
  
  test('Negative Case: Invalid PIN Blocked', async ({ page }) => {
    await page.goto('http://localhost:3000/kitchen');
    await page.fill('input[type="password"]', '555555');
    await page.click('button:has-text("Unlock Dashboard")');
    await expect(page.locator('input[type="password"]')).toBeEmpty();
  });
});
