import { expect, test } from '@playwright/test';
import { trackRuntimeErrors } from './helpers/runtime-assertions';

test('crop-tracking example supports grouping and export actions @smoke', async ({ page }) => {
  const runtimeErrors = trackRuntimeErrors(page);

  await page.goto('/packages/examples/crop-tracking/index.html');

  const board = page.locator('[data-e2e="crop-board"]');
  const modeLabel = page.locator('[data-e2e="crop-mode-label"]');
  const eventLog = page.locator('[data-e2e="crop-event-log"]');

  await expect(board).toBeVisible();
  await expect(board.locator('[part="summary"]')).toContainText('Group: phase');
  await expect(board.locator('[part="summary"]')).toContainText('Editing: local');
  await expect(board.locator('[part="dependency-hitbox"]')).toHaveCount(4);

  const dependencyOrder = await board
    .locator('[part="dependency-hitbox"]')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('data-dependency-id')));
  expect(dependencyOrder).toEqual([
    'dep-z-12-prep-plant',
    'dep-c-17-prep-plant',
    'dep-a-12-plant-scout',
    'dep-b-17-plant-harvest',
  ]);

  await page.locator('[data-e2e="crop-group-resource"]').click();
  await expect(modeLabel).toHaveText('resource');
  await expect(board.locator('[part="summary"]')).toContainText('Group: resource');

  await board.locator('[part="segment"]').first().click();
  await expect(eventLog).toContainText('select: item=');

  const initialCount = await board.locator('[part="item-select"]').count();
  await board.locator('[part="item-delete"]').first().click();
  await expect(board.locator('[part="item-select"]')).toHaveCount(initialCount - 1);
  await expect(eventLog).toContainText('edit-request: action=delete');

  await board.locator('[part="export-json"]').click();
  await expect(eventLog).toContainText('action: export-json');

  await runtimeErrors.assertNoErrors();
});
