# Cooking-guide audit — issue #2

Reviewed all 14 recipes against the October 25, 2026 baseline (`ee6d871`).
Every initial guide was incomplete. The existing seven-day, two-meal plan,
recipe indexes, primary food quantities, and illustrative nutrition values
remain compatible with saved plans.

## Recipe coverage

Each expanded recipe displays a complete measured ingredient list, equipment,
prep and cooking time estimates, numbered preparation and cooking steps,
heat settings, doneness checks, handling guidance, and leftover instructions.
Oil, seasonings, garlic, sauce ingredients, and mash ingredients appear in the
same ingredient data used to generate the shopping list. Cooking water appears
in recipes and is excluded from shopping totals.

| Recipe | Gaps in the original guide | Details now included |
| --- | --- | --- |
| Steak & egg burrito | Unlisted peppers; no seasoning, steak thickness, timing, rest or egg endpoint | Remove the unlisted peppers; 3/4-inch steak; measured salt, pepper and oil; sear to 145°F, rest 3 minutes; eggs to 160°F; warm and fold tortilla |
| Turkey sausage hash | Unspecified sausage form; no potato size, timings, heat or endpoints | Raw turkey sausage to 165°F; 1/2-inch potato cubes simmered until tender; measured seasonings; wilt spinach; scramble eggs to 160°F |
| Smoked salmon toast | Unspecified smoked fish and eggs; no timing or handling checks | Fully cooked hot-smoked salmon heated to 165°F; avocado prep; toast timing; eggs to 160°F |
| Protein pancakes & yogurt | No oat processing, liquid ratio, heat, batch timing or batter doneness | Blend rolled oats; measured water, cinnamon and oil; rest batter; measured pancake portions; cook to 160°F without wet batter; yogurt and washed berries |
| Shakshuka with turkey | Unlisted spices; ambiguous tomatoes, sauce liquid and egg endpoint | Canned diced tomatoes with juice; measured cumin, paprika, salt, pepper, oil and water; turkey to 165°F; covered egg cooking until firm and mixture to 165°F; warm pita |
| Loaded omelet & potatoes | No potato method, ham form, seasoning or filled-omelet check | Roast 1/2-inch potato cubes at 425°F; fully cooked ham to 165°F; measured oil and seasoning; fold and cover omelet until filling reaches 165°F |
| Turkey egg bagels | No heat, timing, quantities for cooking fat or egg/deli meat checks | Toast bagels; fully cooked deli turkey to 165°F; measured oil and seasoning; eggs to 160°F; assemble with Swiss |
| Grilled wings & wedges | No grill setup, wing size, seasoning, side timing or thermometer placement | Bone-in split wings; two-zone 400–425°F grill; indirect cooking to 165°F in multiple pieces away from bone; direct crisping; seasoned 425°F wedges and steamed broccoli |
| Salmon rice bowl | No rice ratio or method, edamame form, fish thickness or timing | Dry long-grain white rice at 1:2 water ratio with covered simmer and rest; 1-inch fillets at 400°F to 145°F; frozen shelled edamame simmered until hot; cucumber prep and measured soy sauce |
| Beef taco bowls | No rice method, bean form, seasoning or ground-beef temperature | Full rice method; canned drained beans; measured spice blend and sauce water; ground beef to 160°F and hot beef/bean mixture to 165°F; salsa assembly |
| Garlic shrimp pasta | Unlisted garlic; no pasta method, shrimp form, timing or sauce quantities | Peeled, deveined raw shrimp to 145°F with firm, pearly, opaque flesh; penne boil and bite check; minced garlic, measured oil and seasonings; reserved pasta water and Parmesan sauce |
| Turkey burgers & fries | No patty size, fry size, seasoning, timings or thermometer placement | Two 6 oz, 3/4-inch patties to 165°F from the side; 1/4-inch sweet potato fries at 425°F with turning and tenderness checks; measured seasonings; toasted buns |
| Chicken thigh stir-fry | No chicken/vegetable cuts, sauce, batch method or rice instructions | Boneless skinless thighs in 1-inch pieces; fresh vegetable prep; measured garlic/soy/cornstarch sauce; two chicken batches to 165°F; complete rice method |
| Pork tenderloin & mash | No oven setting, trimming, timing, mash ingredients or bean method | Trim tenderloin; roast at 425°F to 145°F then rest 3 minutes; fully specified potato boil and mash with milk/butter; green bean simmer; measured oil and seasonings |

## Validation

Run the dependency-free JavaScript checks with:

```sh
node --test tests/recipes.test.cjs
```

The checks exercise all 14 rendered guides, ingredient display, preserved step
boundaries, protein-specific endpoints, whole-cut rests, rice and potato methods,
independently calculated grocery totals, fractional units, copied groceries,
saved-plan reloads, swaps, checkboxes, and seven-day/two-meal generation.

The optional real-browser check requires Playwright and its Chromium binary:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.cjs
```

It opens all 14 guides, compares their visible ingredient and step text with the
recipe data, checks for horizontal overflow at 320, 390 and 1280 pixels, and
exercises tabs, grocery checkboxes, actual clipboard copying, swaps, settings,
reload persistence and week generation. It also checks for browser page errors.
Set `PREPMODE_CHROMIUM_EXECUTABLE_PATH` to use an existing Chromium executable.
Set `PREPMODE_SCREENSHOT_DIR` to capture desktop and mobile guide screenshots.

Results for this change: all seven JavaScript checks passed; the Chromium browser
check passed at all three widths with no page errors. The desktop and mobile
screenshots were visually inspected for readable text, intact numbered lists,
and complete ingredient, preparation, cooking and safety sections.

Manual content review follows every listed ingredient through preparation and
cooking, checks that seasoning/oil allocations sum to the ingredient quantities,
and checks each side dish without consulting another recipe or package method.

## Safety references

Checked October 28, 2026:

- [FoodSafety.gov safe minimum internal temperatures](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures)
- [FDA safe food handling](https://www.fda.gov/food/buy-store-serve-safe-food/safe-food-handling)
- [FDA seafood cooking guidance](https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely)
- [USDA leftover handling and storage](https://ask.fsis.usda.gov/article/How-do-I-handle-leftovers-safely)

The recipes include these safety instructions directly. Reference links are
supporting sources, not a required part of the cooking workflow.

## Validation limit

These recipes have received code checks and a written walkthrough, not a physical
kitchen trial. Times are estimates; the displayed temperature and doneness checks
control when cooking is complete. Brand-specific results and taste still need a
real cooking trial before describing the recipes as kitchen-tested. Nutrition
remains illustrative and has not been recalculated or verified.
