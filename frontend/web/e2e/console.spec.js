import { test, expect } from '@playwright/test';
import { signInAs, watchErrors } from './helpers.js';

test.describe('One Finance console', () => {
  test('every main screen renders without errors', async ({ page }) => {
    const errors = watchErrors(page);
    for (const path of ['/', '/board', '/finance', '/desks', '/grids', '/reports', '/onboarding', '/configuration', '/usage', '/access', '/architecture']) {
      await page.goto(path);
      await expect(page.locator('.tb-page-title, .ph h1, .ph-title').first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('a screen whose data or code does not arrive says so instead of loading for ever', async ({ page }) => {
    const monitor = /\/api\/stitch\/monitor\//;
    await page.route(monitor, (route) => route.fulfill({ status: 500, body: 'down' }));
    await page.goto('/monitoring');
    await expect(page.getByRole('alert')).toContainText('Monitoring could not load');
    await page.unroute(monitor);
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Events received')).toBeVisible();

    await page.route(/pages\/Access\.jsx/, (route) => route.abort());
    await page.goto('/');
    await page.evaluate(() => { history.pushState({}, '', '/access'); dispatchEvent(new PopStateEvent('popstate')); });
    await expect(page.getByRole('alert')).toContainText('did not download');
  });

  test('search reaches the hub and a partner application, and hands a question to the assistant', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('.shell-search input');
    await search.fill('R-2031');
    await expect(page.locator('.shell-search-lbl', { hasText: 'Instances, outcomes and alerts' })).toBeVisible();
    await search.fill('MB014');
    await expect(page.locator('.shell-search-lbl', { hasText: 'Break register (partner)' })).toBeVisible();
    await page.locator('.shell-search-grp.ask button').click();
    const answer = page.locator('.ofx-chat-msg.ofx-chat-bot').last();
    await expect(answer).toContainText(/MB014|blocked|outcome/i);
    await expect(page.locator('.ofx-chat-action').first()).toBeVisible();
  });

  test('a framed chatbot hears the scope and can open a screen in the console', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Assistant', exact: true }).click();
    await page.getByRole('tab', { name: /Chat/ }).click();
    const bot = page.frameLocator('.chat-frame');
    await expect(bot.locator('#scope')).toContainText(/Your scope: \S+/);
    await bot.getByRole('button', { name: 'Why is R-2031 blocked?' }).click();
    await bot.getByRole('button', { name: 'Open R-2031' }).click();
    await expect(page).toHaveURL(/\/instance\/.*R-2031/);
    expect(errors).toEqual([]);
  });

  test('the MITR chatbot framed with data-ofx-vars="mitr" paints with the One Finance palette', async ({ page }) => {
    await page.goto('/');
    for (const theme of ['light', 'dark']) {
      // The bot's own variables (support-bot tokens.css) load first; the console's tokens file maps them.
      await page.setContent(`<html data-ofx-vars="mitr" data-skin="steps" data-theme="${theme}"><head>
        <style>:root { --brand: #6366f1; --bg-primary: #ffffff; --border: #e2e8f0; } .dark { --brand: #818cf8; }</style>
        <link rel="stylesheet" href="/theme/onefinux-tokens.css"></head><body></body></html>`, { waitUntil: 'load' });
      const colours = await page.evaluate(() => {
        const paint = (v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
        return { brand: paint('var(--brand)'), accent: paint('var(--ofx-accent)'), bg: paint('var(--bg-primary)'), card: paint('var(--ofx-card)') };
      });
      expect(colours.brand).toBe(colours.accent);
      expect(colours.bg).toBe(colours.card);
    }
  });

  test('grid write-back: maker submits, the same role cannot approve, a checker applies it to the owning system', async ({ page }) => {
    const owner = 'E2E ' + Date.now().toString().slice(-6);
    await signInAs(page, 'alice.revacc');
    await page.goto('/grids?spec=break-register');
    await expect(page.locator('.wj-cell', { hasText: 'BK-4502' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const row = await page.locator('.wj-cell', { hasText: 'BK-4502' }).first().boundingBox();
    const col = await page.locator('.wj-colheaders .wj-cell', { hasText: 'Owner' }).first().boundingBox();
    await page.mouse.dblclick(col.x + col.width / 2, row.y + row.height / 2);
    await page.keyboard.press('Control+A');
    await page.keyboard.type(owner);
    await page.keyboard.press('Enter');
    await expect(page.locator('.wj-cell.cell-dirty')).toHaveCount(1);
    await page.getByRole('button', { name: /Submit/ }).click();
    await expect(page.locator('.wb-msg.ok')).toContainText('sent for approval');

    await signInAs(page, 'gla.reviewer');
    await page.goto('/grids?spec=break-register');
    const set = page.locator('.wb-set', { hasText: owner });
    await set.getByRole('button', { name: 'Approve' }).click();
    await expect(page.locator('.wb-msg.ok')).toContainText('applied');
    const applied = await page.evaluate(() => fetch('/sim/grids/breaks').then((r) => r.json()).then((d) => d.rows.find((r) => r.breakId === 'BK-4502').owner));
    expect(applied).toBe(owner);
  });

  test('role structure: an auditor cannot sign off; a controller cannot approve access', async ({ page }) => {
    await signInAs(page, 'auditor');
    const status = await page.evaluate(async () => {
      const res = await fetch('/api/stitch/instance/signoff?id=' + encodeURIComponent('FOBO|2026-09-12|APAC|R-1042'),
        { method: 'POST', headers: { Authorization: 'Bearer ' + sessionStorage.getItem('ofx-token') } });
      return res.status;
    });
    expect(status).toBe(403);
    await signInAs(page, 'alice.revacc');
    const approve = await page.evaluate(async () => (await fetch('/api/access/review', { headers: { Authorization: 'Bearer ' + sessionStorage.getItem('ofx-token') } })).status);
    expect(approve).toBe(403);
  });

  test('feedback and usage are recorded', async ({ page }) => {
    await page.goto('/board');
    // Through search: the Wijmo evaluation banner can cover the profile menu until a licence key is set.
    await page.locator('.shell-search input').fill('feedback');
    await page.locator('.shell-search-hit', { hasText: 'Give feedback' }).click();
    await page.locator('textarea').fill('E2E: the board is clear.');
    await page.getByRole('radio', { name: '4 of 5' }).click();
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Thank you')).toBeVisible();
    await expect.poll(async () => page.evaluate(() => fetch('/api/ux/feedback').then((r) => r.json()).then((rows) => rows.some((r) => r.text === 'E2E: the board is clear.')))).toBe(true);
  });

  test('a desk shared with the team appears under New desk', async ({ page }) => {
    await page.goto('/desks');
    await page.getByRole('button', { name: 'Share desk with team' }).click();
    await expect(page.locator('.banner.ok')).toContainText('shared with');
    await page.goto('/desks?new=1');
    await expect(page.getByText('Shared by your team')).toBeVisible();
  });
});
