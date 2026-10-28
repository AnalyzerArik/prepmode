const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const baselinePlan = () => Array.from({ length: 7 }, (_, i) => [i, i + 7]);

function load(saved = { plan: baselinePlan(), cal: 2200, protein: 180, checked: {} }) {
  const elements = new Map();
  const storage = new Map(saved ? [['prepmode-v1', JSON.stringify(saved)]] : []);
  const copied = [];
  const element = id => {
    if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', value: '' });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: { getElementById: element, querySelectorAll: () => [] },
    localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) },
    navigator: { clipboard: { writeText: async text => copied.push(text) } },
    confirm: () => true,
    alert: () => {},
    prompt: () => {}
  });
  vm.runInContext(script + '\nglobalThis.app={recipes,guides,state,groceries,unit,quantity,recipeDetails,make};', context);
  return { ...context.app, elements, storage, copied };
}

test('all 14 recipes display complete guides, including semicolons inside steps', () => {
  const app = load();
  assert.equal(app.recipes.length, 14);
  assert.equal(app.guides.length, 14);
  const meals = app.elements.get('days').innerHTML;
  assert.equal((meals.match(/class="meal"/g) || []).length, 14);
  app.guides.forEach((guide, i) => {
    const displayed = app.recipeDetails(i);
    for (const section of ['Equipment', 'Ingredients', 'Before you start', 'Prepare', 'Cook & serve', 'Doneness & food safety']) {
      assert.ok(displayed.includes('<h4>' + section + '</h4>'), app.recipes[i][0] + ': ' + section);
    }
    assert.match(guide.time, /Prep .+ min · Cook .+ min · Total .+ min/);
    assert.match(guide.equipment, /skillet|saucepan/);
    assert.ok(guide.prep.length >= 2);
    assert.ok(guide.steps.length >= 3);
    for (const step of [...guide.prep, ...guide.steps]) assert.ok(displayed.includes('<li>' + step + '</li>'));
    assert.equal((displayed.match(/<li>/g) || []).length,
      Object.keys(app.recipes[i][4]).length + guide.prep.length + guide.steps.length);
    for (const [name, amount] of Object.entries(app.recipes[i][4])) {
      assert.ok(Number.isFinite(amount) && amount > 0, name);
      assert.ok(displayed.includes('<li>' + app.unit(name, amount) + '</li>'), name);
    }
    assert.match(displayed, /20 seconds/);
    assert.match(displayed, /2 hours/);
    assert.match(displayed, /40°F \(4°C\)/);
    assert.match(displayed, /3–4 days/);
    assert.match(displayed, /Reheat to 165°F \(74°C\)/);
    assert.doesNotMatch(displayed, /according to|package directions|brown.*thoroughly|undefined|NaN/);
  });
});

test('protein-specific safety endpoints and whole-cut rest times are displayed', () => {
  const app = load();
  // Independent acceptance checks: raw poultry, ground beef, egg batter, fish, whole cuts, shrimp.
  for (const i of [1, 4, 7, 11, 12]) assert.match(app.recipeDetails(i), /165°F \(74°C\)/);
  for (const i of [0, 1, 2, 3, 6]) assert.match(app.recipeDetails(i), /160°F \(71°C\)/);
  assert.match(app.recipeDetails(9), /beef must reach 160°F \(71°C\)/);
  for (const i of [0, 13]) {
    assert.match(app.recipeDetails(i), /145°F \(63°C\)/);
    assert.match(app.recipeDetails(i), /rest at least 3 minutes/);
  }
  assert.match(app.recipeDetails(8), /145°F \(63°C\)/);
  assert.match(app.recipeDetails(10), /pearly, opaque and firm all the way through/);
  assert.match(app.recipeDetails(10), /145°F \(63°C\)/);
  assert.match(app.recipeDetails(5), /center reaches 165°F/);
  assert.match(app.recipeDetails(4), /every white and yolk is firm/);
});

test('rice and potato sides have their own water, heat, timing and doneness instructions', () => {
  const app = load();
  for (const i of [8, 9, 12]) {
    const displayed = app.recipeDetails(i);
    assert.match(displayed, /1 1\/2 cups water/);
    assert.match(displayed, /18–20 minutes/);
    assert.match(displayed, /rest covered 5 minutes/);
    assert.match(displayed, /3–5 minutes more/);
  }
  for (const i of [1, 5, 7, 11, 13]) {
    assert.match(app.recipeDetails(i), /fork/);
    assert.match(app.recipeDetails(i), /1\/2-inch|1\/4-inch|1-inch/);
  }
});

test('grocery totals include every added seasoning, oil and garlic but exclude tap water', async () => {
  const app = load();
  const totals = Object.fromEntries(app.groceries());
  assert.equal(totals.Eggs, 23);
  assert.equal(totals['Ground turkey (oz)'], 18);
  assert.equal(totals['Potatoes (oz)'], 44);
  assert.equal(totals['Dry long-grain white rice (cups)'], 2.25);
  assert.equal(totals['Olive oil (tsp)'], 31);
  assert.equal(totals['Garlic cloves'], 5);
  assert.equal(totals['Salt (tsp)'], 3.875);
  assert.equal(totals['Ground cumin (tsp)'], 1.5);
  assert.equal(totals['Paprika (tsp)'], 2.5);
  assert.equal(totals['Soy sauce (tbsp)'], 3);
  assert.equal(totals['Butter (tbsp)'], 1);
  assert.equal(totals['Milk (cups)'], 0.25);
  assert.ok(Object.keys(totals).every(name => !name.startsWith('Water (')));
  assert.match(app.elements.get('list').innerHTML, /31 tsp Olive oil/);
  await app.elements.get('copy').onclick();
  const copied = app.copied[0];
  for (const [name, amount] of app.groceries()) assert.ok(copied.split('\n').includes(app.unit(name, amount)));
  assert.doesNotMatch(copied, /Water|0\.125|0\.25|0\.75/);
});

test('quantity formatting handles measured and counted ingredients without recursion', () => {
  const { unit } = load();
  assert.equal(unit('Salt (tsp)', 0.125), '1/8 tsp Salt');
  assert.equal(unit('Dry long-grain white rice (cups)', 0.75), '3/4 cup Dry long-grain white rice');
  assert.equal(unit('Greek yogurt (cups)', 1), '1 cup Greek yogurt');
  assert.equal(unit('Water (cups)', 1.5), '1 1/2 cups Water');
  assert.equal(unit('Eggs', 3), '3 × Eggs');
  assert.equal(unit('Salmon (oz)', 10), '10 oz Salmon');
});

test('existing saved plan, targets and checks survive loading; swapping updates groceries', () => {
  const app = load({ plan: baselinePlan(), cal: 2400, protein: 190, checked: { Eggs: true } });
  assert.equal(app.elements.get('calText').textContent, 2400);
  assert.equal(app.elements.get('proteinText').textContent, '190g');
  assert.ok(app.elements.get('list').innerHTML.includes('class="done"'));
  assert.equal(JSON.stringify(app.state.plan), JSON.stringify(baselinePlan()));
  const originalDinner = app.state.plan[0][1];
  app.elements.get('days').onclick({ target: { closest: () => ({ dataset: { swap: '0,0' } }) } });
  assert.equal(app.state.plan[0][0], 1); // Full roster fallback replaces breakfast 0 with breakfast 1.
  assert.equal(app.state.plan[0][1], originalDinner);
  assert.equal(Object.keys(app.state.checked).length, 0);
  assert.equal(Object.fromEntries(app.groceries())['Raw turkey sausage (oz)'], 12);
  assert.equal(Object.fromEntries(app.groceries())['Boneless sirloin steak (oz)'], undefined);
  const reloaded = load(JSON.parse(app.storage.get('prepmode-v1')));
  assert.equal(JSON.stringify(reloaded.state.plan), JSON.stringify(app.state.plan));
  assert.equal(reloaded.elements.get('days').innerHTML, app.elements.get('days').innerHTML);
});

test('new weeks still contain seven days with one breakfast and one dinner per day', () => {
  const app = load(null);
  assert.equal(app.state.plan.length, 7);
  assert.equal(new Set(app.state.plan.flat()).size, 14);
  for (const pair of app.state.plan) {
    assert.equal(pair.length, 2);
    assert.equal(app.recipes[pair[0]][1], 'B');
    assert.equal(app.recipes[pair[1]][1], 'D');
  }
  app.elements.get('list').onchange({ target: { dataset: { check: 'Eggs' }, checked: true } });
  assert.equal(app.state.checked.Eggs, true);
  app.elements.get('uncheck').onclick();
  assert.equal(Object.keys(app.state.checked).length, 0);
  app.make();
  assert.equal(new Set(app.state.plan.flat()).size, 14);
});
