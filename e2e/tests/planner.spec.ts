import { type Page, expect, test } from '@playwright/test';
import {
  entity,
  gearTable,
  guidePage,
  overviewTable,
  simpleTable,
} from '@bg3planner/importer/test-helpers';

/** A small guide page shaped like Gamestegy's: three Hexblade levels and some Act 1 gear. */
const GUIDE = guidePage(
  simpleTable('Races', ['Half-Orc']) +
    simpleTable('Background', ['Soldier']) +
    overviewTable([
      {
        level: 1,
        className: 'Warlock 1',
        lines: [
          `<strong>Cantrips:</strong> ${entity('Eldritch Blast')}, ${entity('Booming Blade')}`,
          '<strong>Subclass:</strong> The Hexblade',
          `<strong>Spells:</strong> ${entity('Hex')}, ${entity('Shield')}`,
          'STR - 8, DEX - 14, CON - 15, INT - 8, WIS - 12, CHA - 17',
          '<strong>Skills</strong>: Deception, Intimidation',
        ],
      },
      { level: 2, className: 'Warlock 2', lines: ['<strong>Spells:</strong> Hellish Rebuke'] },
      { level: 3, className: 'Warlock 3', lines: ['<strong>Spells:</strong> Shadow Blade'] },
    ]) +
    '<h2>Equipment Recommendations</h2><h3>Act 1</h3>' +
    gearTable([
      { slot: 'Melee (One-Handed)', items: ['Shadow Blade'] },
      { slot: 'Shield', items: ['Adamantine Shield'] },
      { slot: 'Rings', items: ['Ring of Protection'] },
    ]),
  'Hex Duelist - Shadow Blade Build',
);

const card = (page: Page, name: string) =>
  page.locator('[data-member]', { has: page.locator('h3', { hasText: name }) });

async function importGuide(page: Page) {
  await page.locator('[data-action="import-guide"]').click();
  await page.locator('dialog.import summary').click();
  await page.locator('[data-input="guide-html"]').fill(GUIDE);
  await page.locator('[data-action="import-html"]').click();
  await expect(page.locator('[data-summary]')).toContainText(
    'Level 3: 3 The Hexblade. Half-Orc, Soldier',
  );
  await expect(page.locator('[data-summary]')).toContainText(
    'Gear for Act 1, Act 2 and Act 3.', // later acts keep Act 1's gear
  );
  await page.locator('[data-action="add-imported"]').click();
  await page.waitForURL(/\/c\//);
}

test('create a party, import a guide, save and share it', async ({ page, browser }) => {
  // ---- Create
  await page.goto('/');
  await page.locator('[data-input="party-name"]').fill('E2E Heroes');
  await page.locator('select[name="new-origin"]').selectOption('shadowheart');
  await page.locator('[data-action="add-character"]').click();
  await page.waitForURL(/\/c\//);
  await expect(page.locator('h1.name')).toHaveText('Shadowheart');
  await expect(page.locator('select[name="race"]')).toBeDisabled();
  await page.locator('[data-action="back-to-party"]').click();

  // ---- Import
  await importGuide(page);
  await expect(page.locator('h1.name')).toHaveText('Hex Duelist');
  await page.getByRole('tab', { name: 'Equipment' }).click();
  await expect(page.locator('[data-slot="ring1"]')).toContainText('Ring of Protection');
  await expect(page.locator('[data-summary="armour-class"]')).toContainText('Adamantine Shield');
  await page.locator('[data-details="item:ring-of-protection"]').click();
  await expect(page.locator('[data-details-card]')).toContainText('Armour Class +1');
  await page.keyboard.press('Escape');

  // ---- Saved on this device
  await page.locator('[data-action="back-to-party"]').click();
  await page.reload();
  await expect(page.locator('[data-input="party-name"]')).toHaveValue('E2E Heroes');
  await expect(card(page, 'Shadowheart')).toBeVisible();
  await expect(card(page, 'Hex Duelist')).toBeVisible();

  // ---- Shared online
  await page.locator('[data-action="share"]').click();
  await page.locator('[data-action="share-online"]').click();
  const viewLink = await page.locator('[data-link="view"]').inputValue();
  const editLink = await page.locator('[data-link="edit"]').inputValue();
  await page.keyboard.press('Escape');

  const viewer = await (await browser.newContext()).newPage();
  await viewer.goto(viewLink);
  await expect(viewer.locator('[data-banner="viewing"]')).toBeVisible();
  await expect(viewer.locator('[data-input="party-name"]')).toHaveValue('E2E Heroes');
  await expect(card(viewer, 'Hex Duelist')).toBeVisible();
  await expect(viewer.locator('[data-action="add-character"]')).toHaveCount(0);

  const editor = await (await browser.newContext()).newPage();
  await editor.goto(editLink);
  await editor.waitForURL((url) => url.pathname === '/');
  await expect(card(editor, 'Hex Duelist')).toBeVisible();
  await expect(editor.locator('[data-action="add-character"]')).toHaveCount(1);
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-input="party-name"]').fill('Offline party');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-input="party-name"]')).toHaveValue('Offline party');
  await page.goto('/c/first');
  await expect(page.locator('h1.name')).toBeVisible();
  await context.setOffline(false);
});

test('details open as a sheet on phones @phone', async ({ page }) => {
  await page.goto('/');
  await importGuide(page);
  await page.locator('.sheet [data-details="spell:hex"]').click();
  const sheet = page.locator('[data-details-card]');
  await expect(sheet).toContainText('Level 1 Enchantment');
  await expect(async () => {
    const box = (await sheet.boundingBox())!;
    expect(box.y + box.height).toBeCloseTo(page.viewportSize()!.height, 0);
  }).toPass();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});
