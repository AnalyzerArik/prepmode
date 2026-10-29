const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const plan = () => Array.from({length: 7}, (_, i) => [i, i + 7]);
const savedState = () => ({plan: plan(), cal: 2375, protein: 185, checked: {Eggs: true}});
const plain = value => JSON.parse(JSON.stringify(value));

function start(saved, options = {}) {
  const storage = options.storage || new Map();
  if (saved !== undefined) storage.set('prepmode-v1', JSON.stringify(saved));
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)]
    .map(([, id]) => [id, {id, innerHTML: '', textContent: '', value: '', hidden: id !== 'plan'}]));
  const tabs = ['plan', 'groceries', 'settings'].map(tab => ({dataset: {tab}, className: ''}));
  const alerts = [], prompts = [], clipboard = [];
  const math = Object.create(Math);
  let seed = 12345;
  math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const context = vm.createContext({
    Math: math,
    document: {
      getElementById: id => {
        assert.ok(elements[id], 'known DOM id: ' + id);
        return elements[id];
      },
      querySelectorAll: selector => {
        if (selector === '[data-tab]') return tabs;
        if (selector === 'section') return ['plan', 'groceries', 'settings'].map(id => elements[id]);
        throw new Error('Unexpected selector: ' + selector);
      }
    },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    navigator: {clipboard: {writeText: async text => {
      if (options.clipboardFails) throw new Error('Clipboard unavailable');
      clipboard.push(text);
    }}},
    alert: message => alerts.push(message),
    prompt: (...args) => prompts.push(args),
    confirm: () => options.confirm !== false
  });
  vm.runInContext(script, context, {filename: 'index.html'});
  return {
    elements, tabs, storage, alerts, prompts, clipboard,
    evaluate: code => vm.runInContext(code, context),
    readState: () => plain(vm.runInContext('state', context)),
    groceries: () => plain(vm.runInContext('groceries()', context)),
    swap: (d, j) => elements.days.onclick({target: {closest: () => ({dataset: {swap: d + ',' + j}})}})
  };
}

test('all 28 unsupported nutrient slots are unknown and never rendered as meal/day totals', () => {
  const app = start(savedState());
  assert.deepEqual(plain(app.evaluate('recipes.map(r => [r[2], r[3]])')),
    Array.from({length: 14}, () => [null, null]));
  const rendered = app.elements.days.innerHTML;
  assert.equal((rendered.match(/Daily nutrition pending/g) || []).length, 7);
  assert.equal((rendered.match(/<small>Nutrition pending<\/small>/g) || []).length, 14);
  assert.doesNotMatch(rendered, /\b\d+\s*(?:cal|kcal|g protein)\b/);
  assert.doesNotMatch(rendered, /(?:NaN|undefined|null|0 cal)/);
  // Even an accidentally restored legacy constant cannot become a result.
  app.evaluate('recipes.forEach(r => { r[2] = 123456; r[3] = 654321 }); render()');
  assert.doesNotMatch(app.elements.days.innerHTML, /123456|654321|246912|1308642/);
});

test('every recipe exposes its source status, serving assumption, missing inputs and uncertainty', () => {
  const app = start(savedState());
  const details = plain(app.evaluate('recipes.map((_, i) => nutritionDetails(i))'));
  assert.equal(details.length, 14);
  for (const detail of details) {
    assert.match(detail, /Not calculated from ingredients/);
    assert.match(detail, /No food-composition records/);
    assert.match(detail, /Serving assumption/);
    assert.match(detail, /one person for one planned meal/);
    assert.match(detail, /Missing for this meal/);
    assert.match(detail, /error is unknown/);
    assert.match(detail, /Planned source/);
    assert.match(detail, /No records from it have been used/);
    assert.doesNotMatch(detail, /undefined|NaN|verified nutrition/i);
  }
  assert.match(details[0], /peppers/);
  assert.match(details[2], /avocado's edible weight/);
  assert.match(details[7], /bones and skin/);
  assert.match(details[9], /draining loss/);
  assert.match(details[13], /milk or butter/);
  assert.match(html, /Targets are saved preferences/);
  assert.match(html, /do not resize recipes/);
  assert.doesNotMatch(html, / · High-protein · /);
});

test('saved seven-day plan, targets, checks, identifiers and reload behavior survive unchanged', () => {
  const saved = savedState(), app = start(saved);
  assert.deepEqual(app.readState(), saved);
  assert.equal(app.elements.calText.textContent, 2375);
  assert.equal(app.elements.proteinText.textContent, '185g');
  assert.match(app.elements.list.innerHTML, /class="done"><input type="checkbox" data-check="Eggs" checked/);
  assert.deepEqual(plain(app.evaluate('recipes.map(r => r[1])')),
    [...Array(7).fill('B'), ...Array(7).fill('D')]);
  assert.equal((app.elements.days.innerHTML.match(/Ingredients & cooking steps/g) || []).length, 14);
  assert.equal((app.elements.days.innerHTML.match(/data-swap=/g) || []).length, 14);
  assert.deepEqual(start(undefined, {storage: app.storage}).readState(), saved);
});

test('new weeks retain seven breakfasts and dinners without changing saved targets', () => {
  const app = start(savedState());
  app.elements.generate.onclick();
  const after = app.readState();
  assert.deepEqual(after.plan.map(p => p[0]).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(after.plan.map(p => p[1]).sort((a, b) => a - b), [7, 8, 9, 10, 11, 12, 13]);
  assert.equal(after.cal, 2375);
  assert.equal(after.protein, 185);
  assert.deepEqual(after.checked, {});
  assert.deepEqual(JSON.parse(app.storage.get('prepmode-v1')), after);
  const canceled = start(savedState(), {confirm: false});
  canceled.elements.generate.onclick();
  assert.deepEqual(canceled.readState(), savedState());
});

test('fresh startup generates a plan and keeps the same editable default targets', () => {
  const app = start();
  const state = app.readState();
  assert.equal(state.plan.length, 7);
  assert.ok(state.plan.every(pair => pair.length === 2 && pair[0] < 7 && pair[1] >= 7));
  assert.equal(state.cal, 2200);
  assert.equal(state.protein, 180);
  assert.deepEqual(start(undefined, {storage: app.storage}).readState(), state);
});

test('individual swaps preserve meal category, other choices, grocery updates and pending nutrition', () => {
  for (const slot of [0, 1]) {
    const app = start(savedState());
    app.swap(0, slot);
    const after = app.readState();
    assert.notEqual(after.plan[0][slot], savedState().plan[0][slot]);
    assert.equal(app.evaluate('recipes[state.plan[0][' + slot + ']][1]'), slot ? 'D' : 'B');
    assert.deepEqual(after.plan.slice(1), savedState().plan.slice(1));
    assert.equal(after.plan[0][1 - slot], savedState().plan[0][1 - slot]);
    assert.deepEqual(after.checked, {});
    assert.equal(after.cal, 2375);
    assert.equal(after.protein, 185);
    assert.equal((app.elements.days.innerHTML.match(/Daily nutrition pending/g) || []).length, 7);
    const expected = {};
    const selected = plain(app.evaluate('state.plan.flat().map(i => recipes[i][4])'));
    for (const ingredients of selected)
      for (const [name, amount] of Object.entries(ingredients))
        expected[name] = (expected[name] || 0) + amount;
    assert.deepEqual(Object.fromEntries(app.groceries()), expected);
  }
});

test('grocery quantities, copied text, shopping checks and clipboard fallback retain existing behavior', async () => {
  const app = start(savedState()), groceries = Object.fromEntries(app.groceries());
  assert.equal(groceries.Eggs, 23);
  assert.equal(groceries['Potatoes (oz)'], 44);
  assert.equal(groceries['Dry rice (cups)'], 2.25);
  await app.elements.copy.onclick();
  assert.equal(app.clipboard[0], app.groceries().map(([name, qty]) => qty + ' × ' + name).join('\n'));
  app.elements.list.onchange({target: {dataset: {check: 'Eggs'}, checked: false}});
  assert.equal(app.readState().checked.Eggs, false);
  app.elements.list.onchange({target: {dataset: {check: 'Dry rice (cups)'}, checked: true}});
  assert.equal(app.readState().checked['Dry rice (cups)'], true);
  assert.equal(JSON.parse(app.storage.get('prepmode-v1')).checked['Dry rice (cups)'], true);
  app.elements.uncheck.onclick();
  assert.deepEqual(app.readState().checked, {});
  const fallback = start(savedState(), {clipboardFails: true});
  await fallback.elements.copy.onclick();
  assert.equal(fallback.prompts[0][0], 'Copy this list:');
  assert.equal(fallback.prompts[0][1], app.clipboard[0]);
});

test('settings and tab navigation retain existing behavior without scaling ingredients', () => {
  const app = start(savedState()), groceries = app.groceries();
  app.elements.cal.value = '2450';
  app.elements.protein.value = '195';
  app.elements.save.onclick();
  assert.equal(app.readState().cal, 2450);
  assert.equal(app.readState().protein, 195);
  assert.deepEqual(app.readState().plan, plan());
  assert.deepEqual(app.groceries(), groceries);
  assert.equal(app.alerts.at(-1), 'Saved');
  app.elements.cal.value = '999';
  app.elements.save.onclick();
  assert.equal(app.readState().cal, 2450);
  assert.equal(app.alerts.at(-1), 'Invalid targets');
  for (const tab of app.tabs) {
    tab.onclick();
    for (const id of ['plan', 'groceries', 'settings'])
      assert.equal(app.elements[id].hidden, id !== tab.dataset.tab);
  }
});
