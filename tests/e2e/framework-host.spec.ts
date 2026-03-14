import { expect, test } from '@playwright/test';
import { trackRuntimeErrors } from './helpers/runtime-assertions';

test('framework-host example wires host controls and selection events @smoke', async ({ page }) => {
  const runtimeErrors = trackRuntimeErrors(page);

  await page.goto('/packages/examples/framework-host/index.html');

  const board = page.locator('[data-e2e="framework-board"]');
  const lastEvent = page.locator('[data-e2e="framework-last-event"]');

  await expect(board).toBeVisible();
  await expect(board.locator('[part="summary"]')).toContainText('Group: lane');
  await expect(board.locator('[part="summary"]')).toContainText('Editing: local');
  await expect(board.locator('[part="dependency-hitbox"]')).toHaveCount(2);

  const dependencyOrder = await board
    .locator('[part="dependency-hitbox"]')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('data-dependency-id')));
  expect(dependencyOrder).toEqual(['dep-z-plant-irrigate', 'dep-a-irrigate-scout']);

  await page.locator('[data-e2e="framework-group-hierarchy"]').click();
  await expect(board.locator('[part="summary"]')).toContainText('Group: hierarchy');

  await board.locator('[part="segment"]').first().click();
  await expect(lastEvent).toContainText('select -> item=');

  const initialCount = await board.locator('[part="item-select"]').count();
  await board.locator('[part="item-delete"]').first().click();
  await expect(board.locator('[part="item-select"]')).toHaveCount(initialCount - 1);
  await expect(lastEvent).toContainText('edit-request -> action=delete');

  await runtimeErrors.assertNoErrors();
});
