// Optional browser check: install Playwright and Chromium as described in RECIPE_QA.md.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PREPMODE_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote']
    });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const url = 'http://127.0.0.1:' + server.address().port;
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url });
    await context.addInitScript(() => {
      if (!localStorage.getItem('prepmode-v1')) localStorage.setItem('prepmode-v1', JSON.stringify({
        plan: Array.from({ length: 7 }, (_, i) => [i, i + 7]),
        cal: 2400, protein: 190, checked: { Eggs: true }
      }));
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(url);
    assert.equal(await page.locator('.meal').count(), 14);
    assert.equal(await page.locator('#calText').innerText(), '2400');

    const guideFailures = await page.evaluate(() => {
      const failures = [];
      const order = state.plan.flat();
      document.querySelectorAll('.meal').forEach((meal, position) => {
        const index = order[position], guide = meal.querySelector('details');
        guide.open = true;
        const text = guide.innerText;
        const expectedIngredients = Object.entries(recipes[index][4]).map(([name, amount]) => unit(name, amount));
        const actualIngredients = [...guide.querySelectorAll('.ingredients li')].map(li => li.innerText);
        if (JSON.stringify(expectedIngredients) !== JSON.stringify(actualIngredients)) failures.push(recipes[index][0] + ': ingredients');
        const lists = guide.querySelectorAll('ol');
        if (lists.length !== 2) failures.push(recipes[index][0] + ': step lists');
        else for (const [list, expected] of [[lists[0], guides[index].prep], [lists[1], guides[index].steps]]) {
          if (JSON.stringify([...list.children].map(li => li.innerText)) !== JSON.stringify(expected)) failures.push(recipes[index][0] + ': step text');
        }
        for (const required of ['Equipment', 'Prepare', 'Cook & serve', 'Doneness & food safety', '2 hours', '3–4 days', 'Reheat to 165°F']) {
          if (!text.includes(required)) failures.push(recipes[index][0] + ': ' + required);
        }
      });
      return failures;
    });
    assert.deepEqual(guideFailures, []);

    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Guide overflow at ' + width);
    }
    if (process.env.PREPMODE_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.PREPMODE_SCREENSHOT_DIR, { recursive: true });
      await page.locator('.meal').first().screenshot({ path: path.join(process.env.PREPMODE_SCREENSHOT_DIR, 'recipe-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.meal').first().screenshot({ path: path.join(process.env.PREPMODE_SCREENSHOT_DIR, 'recipe-mobile.png') });
    }

    await page.getByRole('button', { name: 'Groceries', exact: true }).click();
    assert.ok(await page.locator('input[data-check="Eggs"]').isChecked());
    assert.ok((await page.locator('#list').innerText()).includes('31 tsp Olive oil'));
    assert.ok(!(await page.locator('#list').innerText()).includes('Water'));
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Grocery overflow at ' + width);
    }
    await page.getByRole('button', { name: 'Clear checks', exact: true }).click();
    assert.ok(!(await page.locator('input[data-check="Eggs"]').isChecked()));
    await page.locator('input[data-check="Eggs"]').check();
    await page.getByRole('button', { name: 'Copy list', exact: true }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(copied.includes('31 tsp Olive oil'));
    assert.ok(copied.includes('2 1/4 cups Dry long-grain white rice'));
    assert.ok(!copied.includes('Water'));

    await page.getByRole('button', { name: 'Meal plan', exact: true }).click();
    const dinner = await page.locator('.meal strong').nth(1).innerText();
    await page.locator('[data-swap="0,0"]').click();
    assert.equal(await page.locator('.meal strong').first().innerText(), 'Turkey sausage hash');
    assert.equal(await page.locator('.meal strong').nth(1).innerText(), dinner);
    await page.reload();
    assert.equal(await page.locator('.meal strong').first().innerText(), 'Turkey sausage hash');
    assert.equal(await page.locator('#calText').innerText(), '2400');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('#cal').fill('2500');
    await page.locator('#protein').fill('200');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.reload();
    assert.equal(await page.locator('#calText').innerText(), '2500');
    assert.equal(await page.locator('#proteinText').innerText(), '200g');
    await page.locator('#generate').click();
    const plan = await page.evaluate(() => state.plan);
    assert.equal(plan.length, 7);
    assert.equal(new Set(plan.flat()).size, 14);
    assert.ok(plan.every(pair => pair.length === 2 && pair[0] < 7 && pair[1] >= 7));
    assert.deepEqual(errors, []);
    console.log('PASS: all 14 displayed guides; 320/390/1280 px layouts; groceries/copy/checks; swaps; settings; persistence; two-meal generation; no page errors.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
