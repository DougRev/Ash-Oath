# Army / Armory design spec

Use the generated army-overview-concept.png and armory-workshop-concept.png as layout references. Retain the existing global Shell, fonts, logo, resource bar and background art; concept-invented dates, AP caps, prices, counts and filled icons are explicitly rejected in favor of authoritative state and existing Lucide outline icons. Fix the concept defense armor-gap arithmetic. These are intentional implementation deviations, not game rule changes.

Tokens: background #0f1814, panels #17221b, borders #394535, text #eee4ca, muted #aebaa3, accent #d3b574. Headings existing Cormorant Garamond, controls existing Inter at 13-14px. 24px panels, 18px mobile. 20px grid gutters, 6px radii, no new decorative art. Army: two force panels, readiness bars, weapon mix, compact capacity band, two forms. Armory: role selector, readiness strip, five-row kit selector, one order inspector with Equip stored / Buy gear / Store gear modes. Buy mode offers purchase-to-storage or purchase-and-equip explicitly. Costs and replacement previews are derived from the same assigned inventory as combat.

Responsive: force panels and form panels stack below 760px; armory list stacks over inspector below 1000px; roles always visible, labels and counts retained. No hidden horizontal primary controls. Keyboard-visible selection and native labels, semantic buttons, accessible progress indicators. Existing character inventory remains a separate third tab.

Functional scope: preserve all current army actions, milestone locks, unarmed recruitment, source-role storage on transfer, mixed kits, and expedition locks. Both force totals shown together; missing weapon and missing armor counts are distinct and not added as if unique soldiers. Deploying troops remain in offense total; show deployed versus home when expedition active.

## Fidelity ledger and verification

Compared both generated concepts against the rendered desktop screens at 1440px and the mobile screens at 390px.

| Reference point | Implemented result |
| --- | --- |
| Army hierarchy | Two equally prominent offense/defense cards show troop count and power before equipment details. |
| Readiness | Separate weapon and armor coverage bars and gaps, plus the actual mixed weapon inventory. Counts follow saved realm state. |
| Command layout | Compact barracks capacity band followed by separate recruitment and transfer forms, matching the concept grouping. |
| Armory layout | Five compact kit rows beside one selected-item inspector; a single order review replaces repeated controls on every row. |
| Visual language | Dark green surfaces, restrained gold accents, Cormorant headings, Inter controls, and existing Lucide icons match the brief. |
| Deliberate deviations | Existing shell, resource bar, real prices, real unlocks and current artwork retained. The functional buy destination selector and lock explanations add height relative to the concept. |
| Mobile | Force cards, forms and inspector stack; role controls remain visible; inventory columns and order controls fit 390px without horizontal scrolling. The inspector stacks at 1100px to accommodate the existing sidebar. |
| Accessibility | Named force overview/readiness regions, labeled native inputs, visible keyboard focus and accessible coverage progress bars. |

Concept assets: `army-overview-concept.png` and `armory-workshop-concept.png`, generated for this overhaul. Prompts emphasized an Army command overview and an Armory kit catalog/order inspector using the tokens above. They are design references; the app retains its existing production artwork.

Validation: production TypeScript/Vite build; three existing browser regressions covering equipment, dungeon parties, raids and progression; a dedicated emulator test covering both force summaries, partial purchases, free stored gear, armor, transfers, recruitment, milestone restrictions and expedition locks. Desktop and mobile screenshots visually reviewed. No gameplay balance or backend schema changes in this release.

Published September 15, 2026 to Firebase Hosting. Live HTML and the index-9fcnDBUp.js bundle verified over HTTPS after release.
