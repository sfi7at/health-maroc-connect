import { test, expect, type Page } from "@playwright/test";

/**
 * Visual regression suite for typography and shadcn primitives.
 *
 * Covers:
 *  - /dev/typography (component showcase — Button, Input, Select, Dialog, Badge, Table, headings)
 *  - A handful of high-traffic public pages
 *  - Light + dark theme, desktop + mobile viewports (via playwright.config projects)
 *
 * The suite deliberately targets only public routes; authenticated flows need a
 * session fixture and are out of scope for this baseline pass.
 */

const PUBLIC_PAGES = [
  { path: "/", name: "home" },
  { path: "/doctors", name: "doctors" },
  { path: "/blood", name: "blood" },
  { path: "/about", name: "about" },
] as const;

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

async function applyTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("theme", t);
      window.localStorage.setItem("vite-ui-theme", t);
    } catch {}
  }, theme);
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(t);
  }, theme);
}

async function stabilise(page: Page) {
  // Kill motion + blinking carets so snapshots are deterministic.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      html { scroll-behavior: auto !important; }
    `,
  });
  // Web fonts must be settled before we snapshot typography.
  await page.evaluate(() => (document as any).fonts?.ready);
}

test.describe("Typography — component showcase", () => {
  for (const theme of THEMES) {
    test(`showcase renders consistently (${theme})`, async ({ page }, testInfo) => {
      await applyTheme(page, theme);
      await page.goto("/dev/typography", { waitUntil: "networkidle" });
      await stabilise(page);

      await expect(page).toHaveScreenshot(`showcase-${theme}-${testInfo.project.name}.png`, {
        fullPage: true,
      });

      // Per-section snapshots isolate which primitive drifted when the full-page diff trips.
      for (const section of ["headings", "buttons", "badges", "inputs", "dialog", "table"]) {
        const locator = page.locator(`[data-vr-section="${section}"]`);
        await expect(locator).toHaveScreenshot(
          `showcase-${section}-${theme}-${testInfo.project.name}.png`,
        );
      }
    });
  }
});

test.describe("Typography — public pages", () => {
  for (const theme of THEMES) {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`${name} above-the-fold (${theme})`, async ({ page }, testInfo) => {
        await applyTheme(page, theme);
        await page.goto(path, { waitUntil: "networkidle" });
        await stabilise(page);

        // Above-the-fold only — full-page snapshots of dynamic lists are too flaky
        // for typography regression signal.
        await expect(page).toHaveScreenshot(
          `page-${name}-${theme}-${testInfo.project.name}.png`,
          { fullPage: false },
        );
      });
    }
  }
});