const { chromium } = require('playwright');
const assert = require('assert'),
  fs = require('fs'),
  path = require('path');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  let backendWrites = [];
  await context.route('**/api/**', (r) => {
    if (r.request().method() !== 'GET') backendWrites.push(r.request().url());
    return r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:3000/dev/admin', {
    waitUntil: 'networkidle',
  });
  await page.getByRole('heading', { name: 'Exams', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Sandbox saved draft');
  await page
    .getByRole('button', { name: 'Save exam', exact: true })
    .first()
    .click();
  await page
    .getByText('Exam saved. Reports use the latest grading rules.')
    .waitFor();
  await page.getByLabel('Simulate save failure').check();
  await page.getByLabel('Title', { exact: true }).fill('Keep failed draft');
  await page
    .getByRole('button', { name: 'Save exam', exact: true })
    .first()
    .click();
  await page.getByText(/Your draft is preserved/).waitFor();
  assert.equal(
    await page.getByLabel('Title', { exact: true }).inputValue(),
    'Keep failed draft',
  );
  await page.getByLabel('Simulate save failure').uncheck();
  await page
    .getByRole('button', { name: 'Save exam', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Questions (5)', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add section', exact: true }).click();
  await page
    .getByRole('button', { name: 'Save exam', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Simulate existing attempts' })
    .click();
  await page.getByText(/Question structure is locked/).waitFor();
  await page.getByRole('button', { name: 'JSON pro', exact: true }).click();
  assert(await page.getByRole('textbox', { name: 'Exam JSON' }).isDisabled());
  await page.getByRole('button', { name: 'Unlock sample structure' }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  const qa = [];
  for (const theme of ['plain', 'autumn', 'holiday', 'creator']) {
    await page.getByLabel('Start from').selectOption(theme);
    await page
      .getByRole('button', { name: 'Preview', exact: true })
      .first()
      .click();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const state of [
        'entry',
        'instructions',
        'questions',
        'date',
        'completed',
        'upcoming',
        'ended',
        'terminated',
        'timed_out',
      ]) {
        await page
          .getByLabel('Preview screen', { exact: true })
          .selectOption(state);
        await page.waitForTimeout(80);
        qa.push({
          theme,
          state,
          ...(await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
          }))),
        });
      }
    }
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('button', { name: 'Theme', exact: true }).click();
  }
  await page
    .getByRole('button', { name: 'Switch to dark admin theme' })
    .click();
  const out = path.resolve(
    __dirname,
    '../../../docs/admin-ux-proposal/implementation-qa',
  );
  await page.screenshot({
    animations: 'disabled',
    path: path.join(out, 'sandbox-dark.png'),
    fullPage: true,
  });
  assert.deepEqual(backendWrites, []);
  assert.deepEqual(errors, []);
  assert(qa.every((q) => q.scroll <= q.width));
  fs.writeFileSync(
    path.join(out, 'sandbox-results.json'),
    JSON.stringify({ checks: qa.length, qa, errors, backendWrites }, null, 2),
  );
  console.log(JSON.stringify({ checks: qa.length, errors, backendWrites }));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
