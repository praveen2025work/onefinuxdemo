import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.1 A/AA checks on the main screens. Critical and serious findings fail the build; the Wijmo evaluation
// banner (shown until a licence key is set) and framed third-party screens are out of scope.
const SCREENS = ['/', '/board', '/desks', '/grids', '/onboarding', '/configuration', '/access', '/usage', '/product'];

for (const path of SCREENS) {
  test(`accessibility: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('iframe')
      .exclude('a[href*="wijmo"]')
      .exclude('div[style*="z-index: 2147483647"]')
      .analyze();
    const blocking = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
    const summary = blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target?.join(' ')}`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
