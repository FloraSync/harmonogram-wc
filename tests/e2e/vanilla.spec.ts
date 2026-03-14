import { expect, test } from '@playwright/test';
import { trackRuntimeErrors } from './helpers/runtime-assertions';

test('vanilla use-case simulator switches scenarios and captures board interactions @smoke', async ({ page }) => {
  const runtimeErrors = trackRuntimeErrors(page);

  await page.goto('/packages/examples/vanilla/index.html');

  const board = page.locator('[data-e2e="vanilla-board"]');
  const eventLog = page.locator('[data-e2e="vanilla-event-log"]');
  const scenarioDescription = page.locator('[data-e2e="scenario-description"]');

  await expect(board).toBeVisible();
  await expect(board.locator('[part="summary"]')).toContainText('Editing: local');
  await expect(page.locator('[data-e2e="comparison-table"]')).toBeVisible();
  await expect(board.locator('[part="dependency-hitbox"]')).toHaveCount(4);
  await expect(board.locator('[part="dependency-hitbox"]').first()).toHaveAttribute(
    'data-dependency-id',
    'dep-z-a-heat-roll',
  );

  const initialDependencyOrder = await board
    .locator('[part="dependency-hitbox"]')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('data-dependency-id')));
  expect(initialDependencyOrder).toEqual([
    'dep-z-a-heat-roll',
    'dep-c-a-roll-finish',
    'dep-a-b-heat-roll',
    'dep-b-b-roll-finish',
  ]);

  await page.locator('[data-e2e="scenario-or-scheduling"]').click();
  await expect(scenarioDescription).toContainText('operating room');

  await page.locator('[data-e2e="group-by-select"]').selectOption('resource');
  await expect(board.locator('[part="summary"]')).toContainText('Group: resource');

  await board.locator('[part="segment"]').first().click();
  await expect(eventLog).toContainText('select: item=');

  const initialSegmentTitle = await board.locator('[part="segment"]').first().getAttribute('title');
  await board.locator('[part="item-move"]').first().click();
  await expect(eventLog).toContainText('edit-request: action=move');
  const movedSegmentTitle = await board.locator('[part="segment"]').first().getAttribute('title');
  expect(movedSegmentTitle).not.toBe(initialSegmentTitle);

  await board.locator('[part="export-json"]').click();
  await expect(eventLog).toContainText('action: export-json');

  await runtimeErrors.assertNoErrors();
});
