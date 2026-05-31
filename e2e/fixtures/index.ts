import { test as base } from '@playwright/test';
import { AppPage } from '../helpers/app.page';

type Fixtures = {
  app: AppPage;
  withSeed: AppPage;
  withClear: AppPage;
};

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    await use(new AppPage(page));
  },

  withSeed: async ({ page }, use) => {
    const app = new AppPage(page);
    await page.goto('/');
    await app.clearAllData();
    await app.loadSeedData();
    await use(app);
  },

  withClear: async ({ page }, use) => {
    const app = new AppPage(page);
    await page.goto('/');
    await app.clearAllData();
    await use(app);
  },
});

export { expect } from '@playwright/test';
