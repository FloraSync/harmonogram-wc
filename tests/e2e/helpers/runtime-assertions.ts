import { expect, type Page } from '@playwright/test';

interface RuntimeErrorTracker {
  assertNoErrors: () => Promise<void>;
}

export function trackRuntimeErrors(page: Page): RuntimeErrorTracker {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return;
    }

    errors.push(`console.error: ${message.text()}`);
  });

  return {
    async assertNoErrors() {
      expect(errors, 'Unexpected browser runtime errors were captured.').toEqual([]);
    },
  };
}
