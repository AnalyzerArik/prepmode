# PrepMode nutrition audit and calculation contract

Audit date: October 29, 2026. Scope: [issue #3](https://github.com/AnalyzerArik/prepmode/issues/3), against main commit [ee6d871e59bdfc4403d61522a45f425a5d74f3b3](https://github.com/AnalyzerArik/prepmode/commit/ee6d871e59bdfc4403d61522a45f425a5d74f3b3).

## What this patch establishes

**There are zero source-backed recipe nutrition calculations in this release.** All 14 calorie figures and all 14 protein figures are unsupported illustrations. This patch withdraws those figures and their daily sums from the app. It records them below for audit purposes, replaces their active data slots with `null`, and shows “Nutrition pending” with recipe-specific gaps and the current serving assumption. Null means unavailable; it must never become zero nutrition.

The seven-day/two-meal plan, stable recipe indexes and categories, ingredient quantities, cooking guides, generation, swaps, grocery sums, shopping checks, saved targets, and `prepmode-v1` storage key are retained. The “High-protein” preference claim is removed until nutrition supports it. Recipe names are retained as identifiers, including “Protein pancakes & yogurt”; that name is not a verified protein claim.

This is a containment fix and a specification for the calculation work still needed. It does **not** complete the ingredient calculations required by issue #3. Keep that issue open. Do not describe this patch as verified macros, USDA-backed meals, or validated dietary targets.

## Exactly what was unsupported

The original `recipes` rows were `[name, category, illustrativeCalories, illustrativeProteinGrams, ingredients]`. Both numbers were constants. `render()` displayed them without an adjacent uncertainty label and summed two constants into a daily total. The footer alone called them illustrative. There was no ingredient nutrient database, source record ID, source version/date, portion conversion, cooked yield, consumption fraction, or recipe-serving divisor.

**Every number in the following two numeric columns is archived, unverified, and unsuitable as a nutritional result.** The listed quantities are recipe planning inputs, not verified nutritional weights. Every ingredient in every row lacks a linked composition record. The final column adds meal-specific gaps to that universal deficiency.

| Index | Recipe | Old illustrative kcal | Old illustrative protein (g) | Current planning ingredients | Additional unsupported choices |
| --- | --- | ---: | ---: | --- | --- |
| 0 | Steak & egg burrito | 920 | 66 | 3 × Eggs; 1 × Tortillas; 6 × Sirloin (oz); 1 × Cheddar (oz) | Tortilla size and product, egg size, sirloin trim and raw/cooked weight, and cheddar type are unspecified. The cooking guide also mentions peppers without an ingredient amount. |
| 1 | Turkey sausage hash | 870 | 64 | 3 × Eggs; 6 × Turkey sausage (oz); 10 × Potatoes (oz); 2 × Spinach (cups) | Egg size, turkey sausage product and fat content, potato raw/cooked weight, and spinach cup weight are unspecified. |
| 2 | Smoked salmon toast | 810 | 60 | 3 × Eggs; 5 × Smoked salmon (oz); 3 × Bread slices; 1 × Avocados | Egg size, smoked salmon product, bread slice weight, and the avocado's edible weight are unspecified. |
| 3 | Protein pancakes & yogurt | 850 | 63 | 1 × Oats (cups); 3 × Eggs; 1 × Greek yogurt (cups); 1 × Berries (cups) | Oat form and cup weight, egg size, yogurt fat/sugar content and cup weight, and berry type and cup weight are unspecified. |
| 4 | Shakshuka with turkey | 880 | 67 | 4 × Eggs; 6 × Ground turkey (oz); 1 × Tomatoes (cups); 2 × Pita | Egg size, turkey fat percentage and raw/cooked weight, tomato form and cup weight, and pita size are unspecified. Spices are mentioned without amounts. |
| 5 | Loaded omelet & potatoes | 910 | 65 | 4 × Eggs; 5 × Ham (oz); 2 × Cheddar (oz); 10 × Potatoes (oz) | Egg size, ham product, cheddar type, and potato raw/cooked weight are unspecified. |
| 6 | Turkey egg bagels | 900 | 68 | 3 × Eggs; 2 × Bagels; 6 × Turkey slices (oz); 2 × Swiss (oz) | Egg size, bagel weight, deli turkey product, and Swiss cheese type are unspecified. |
| 7 | Grilled wings & wedges | 1130 | 94 | 16 × Chicken wings (oz); 12 × Potatoes (oz); 2 × Broccoli (cups) | Wing weight does not say whether bones and skin are included or whether it is raw or cooked. Edible wing yield, potato weight basis, and broccoli cup weight are missing. |
| 8 | Salmon rice bowl | 1090 | 83 | 10 × Salmon (oz); 0.75 × Dry rice (cups); 1 × Edamame (cups); 1 × Cucumbers | Salmon species and raw/cooked weight, dry rice type and cup weight, edamame form and cup weight, and cucumber edible weight are unspecified. |
| 9 | Beef taco bowls | 1180 | 91 | 12 × Ground beef (oz); 0.75 × Dry rice (cups); 1 × Black beans (cups); 0.5 × Salsa (cups) | Beef fat percentage, raw/cooked weight and draining loss, dry rice cup weight, bean form and drained cup weight, and salsa product are unspecified. |
| 10 | Garlic shrimp pasta | 1050 | 89 | 14 × Shrimp (oz); 5 × Dry pasta (oz); 1 × Parmesan (oz); 2 × Spinach (cups) | Shrimp raw/cooked and shell/peeling weight basis, dry pasta type, Parmesan type, and spinach cup weight are unspecified. Garlic is mentioned without an ingredient amount. |
| 11 | Turkey burgers & fries | 1100 | 90 | 12 × Ground turkey (oz); 2 × Burger buns; 12 × Sweet potatoes (oz) | Turkey fat percentage and raw/cooked weight, bun weight, and sweet potato raw/cooked weight are unspecified. |
| 12 | Chicken thigh stir-fry | 1120 | 91 | 14 × Chicken thighs (oz); 0.75 × Dry rice (cups); 3 × Mixed vegetables (cups) | Thigh raw/cooked, bone and skin weight basis, dry rice cup weight, and the vegetable mix and cup weight are unspecified. |
| 13 | Pork tenderloin & mash | 1070 | 93 | 13 × Pork tenderloin (oz); 12 × Potatoes (oz); 2 × Green beans (cups) | Pork raw/cooked weight and trim, potato weight basis, and green bean form and cup weight are unspecified. Mash additions such as milk or butter are not listed. |

Common gaps across the table:

- A count (egg, tortilla, bread slice, pita, bagel, bun, fruit) has no specified edible gram weight. Cups have no food-specific weight conversion. “oz” is not explicitly tied to an edible raw/cooked mass.
- Oil, sauces, butter, milk and other additions are not consistently quantified. Where the current guide mentions peppers, garlic or spices absent from its ingredients, nutrition cannot account for them.
- The code assigns a recipe's complete ingredient list to one person's planned meal. “One person” and “two meals/day” do not establish a validated recipe yield or amount actually eaten. There is no serving-size control or yield field.
- No cooking/draining losses, skin/bone refuse, leftovers, or oil remaining in the pan are modeled. Their effects are unknown, not a defensible fixed percentage.
- The daily totals inherited every underlying gap. Correct addition of unsupported constants does not validate their food basis.
- Calories and protein are the only nutrients represented; there are no stored carbohydrate or fat results to verify.
- Default targets of 2,200 kcal and 180 g protein, or the user's saved replacements, are preference values. Generation and swapping use meal categories and indexes, not these targets. Targets neither resize ingredients nor prove adequacy.

No error bars, confidence percentages, or replacement macro values can be supported from the current data.

## Food-composition source: documented, not yet populated

The selected source for the next increment is **USDA FoodData Central (FDC)**. No FDC food records or nutrient values have been imported in this patch. The app explicitly states this beside each recipe; merely linking USDA is not meal provenance.

Official documentation reviewed on October 29, 2026:

1. [Foundation Foods documentation](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/): food descriptions distinguish preparation forms; portions concern edible material, and portion nutrients scale from nutrient amounts per 100 g and edible gram weights.
2. [FDC data-type documentation](https://fdc.nal.usda.gov/data-documentation/): Foundation Foods, SR Legacy, FNDDS and Branded Foods have different origins; branded values come from product labels. Preserve that distinction in provenance.

Use a matching generic record for a stated generic ingredient or a matching branded record for a stated product. Review the preparation form, cut, fat percentage, brand, and portion match rather than selecting the first search result. A generic substitute remains an explicitly disclosed assumption. Source documentation is evidence for a method, not evidence for any number in the archived table.

## Smallest next increment that may display calculated estimates

Populate and check one complete recipe at a time. Other recipes remain pending; no planner or persistence migration is needed. Add a separate nutrition object keyed by the existing recipe index, rather than restoring unsupported numbers to the reserved slots.

For each ingredient, retain:

| Field | Evidence required |
| --- | --- |
| Recipe ingredient and amount | Exact link to the displayed ingredient; include additions used by the cooking method. |
| Food match | FDC ID, description, data type, raw/cooked/drained form, brand where relevant, canonical record link. |
| Snapshot | Retrieval date, publication/version date if available, and a checked-in source excerpt/snapshot with file hash for reproducibility. |
| Nutrient basis | Energy in kcal and protein in g, each on a documented 100 g basis, with the source nutrient field/ID and units. Do not mix kcal and kJ or energy definitions. |
| Edible mass | Edible grams matching the record's preparation form. For counts or volumes, retain the exact food-specific portion conversion and source, or a documented measured weight. Do not assign water density to arbitrary foods. |
| Refuse/loss assumptions | State whether weights include bones/skin and how edible mass was obtained; record any retained/consumed fractions with their basis. Do not apply a cooked density to raw grams. |
| Missingness | A missing record, portion conversion or nutrient is `null`, never an invented zero. An explicit source-reported zero may be used. |

For servings, explicitly declare the number of portions made by the listed ingredient quantities and portions assigned to the planned meal. Require positive finite values. If the meal consumes the whole recipe, say so; if it consumes half, divide accordingly. A weighed cooked yield is needed when converting a gram-based serving to a fraction of the recipe; it is not needed merely to divide a declared recipe into equal portions. Retain the current whole-recipe-per-meal behavior unless an explicit serving change is made.

For nutrient `n`, the base arithmetic is:

```text
ingredient_n = edible_grams × source_n_per_100g / 100
recipe_n = sum of all included ingredient_n
meal_n = recipe_n × portions_eaten / recipe_portions
day_n = sum of the two planned meal_n values
```

Use matching as-consumed weights/forms when available. A raw ingredient sum may instead be shown as an **input-based estimate**, with an explicit assumption that all listed ingredients are consumed; it must disclose unmeasured draining/cooking/discard losses. Apply a retention or consumption factor only when its basis is documented, with no duplicate raw-to-cooked adjustment. Cooking water is not food energy, but additions and any nutrients discarded with cooking liquid still need a stated treatment.

The arithmetic is an application contract following the documented per-100-g scaling rule. It has not yet been implemented against real recipe records.

## Display and validation rules for that increment

| Evidence status for a nutrient | Meal display | Daily display |
| --- | --- | --- |
| No source/portion evidence, including every current recipe | “Nutrition pending”; show missing inputs and provenance status; withhold the number. | Pending; never add legacy illustrations or coerce null to zero. |
| Some ingredients supported; others missing | Pending for the full meal. Any diagnostic subtotal must say “partial ingredients only” and list omissions. | Pending for that nutrient. A partial subtotal is not a daily total. |
| Every ingredient supported, portions declared, arithmetic checked | “Calculated estimate” with serving basis, source records, date, and concrete assumptions. | Calculated estimate for **these two planned meals** only, when both meal values qualify for that nutrient. |
| Kitchen serving/brand differs from the recorded assumptions | Disclose the mismatch; recalculate with supported inputs or keep the result pending. | Do not silently retain a prior qualified total. |

Treat energy and protein completeness independently. If only protein is complete, do not invent energy, and vice versa. Checking source transcription, matching, units and arithmetic does not turn an estimated meal into a laboratory-verified meal. Use “arithmetic checked” for that limited claim; never an unqualified “verified nutrition” badge. Quantify uncertainty only when the chosen evidence supports it; otherwise state the specific sources of variation and that error magnitude is unknown.

Before enabling a recipe, check a hand calculation against the saved source snapshot; cover per-100-g scaling, equal-portion division, gram-based portions when used, raw/cooked mismatches, missing nutrients versus true zeros, added oil, and edible wing yield. Test that one unsupported meal blocks a daily total and that recipe changes invalidate previously calculated results. Preserve planner, grocery and saved-target regression checks.

## Relationship to the cooking-guide draft

[Draft PR #5](https://github.com/AnalyzerArik/prepmode/pull/5) at [42cd43ebe0e736fd9732cc68407646812e91b5cf](https://github.com/AnalyzerArik/prepmode/commit/42cd43ebe0e736fd9732cc68407646812e91b5cf) was inspected and remains unmerged. It defines additional oils, seasonings, sauces, milk and butter, and clarifies several raw/edible forms. It retains the same unsupported nutrition constants.

This patch is based on current main and does not merge or replace that work. When combining them, preserve its ingredient/guide additions, keep nutrition slots null and daily sums withheld, and update the gap notes to match the clarified ingredients. The future ingredient calculations must include those additions. Neither PR supplies food-composition records.

## Validation of this containment patch

Run `node --test tests/nutrition.test.cjs`. The tests execute the app's script in a minimal DOM harness: they check that all 14 meals and seven daily summaries withhold unsupported figures, each meal explains its evidence gaps, and saved plans, category swaps, grocery aggregation/copying/checks, settings, reloads, tabs and week generation continue working.

These are data and behavior checks, not a graphical browser layout test or a test of real nutrition calculations. The patch contains no such calculations.
