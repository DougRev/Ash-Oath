# Visual implementation specification

Working concept: `design/overview-concept.png`, created with the built-in Image Gen tool. The source prompt and standalone asset prompts are recorded in `design/image-prompts.md`.

## Composition

Desktop reference is 1536 × 1024. A 216px persistent left rail, a 76px horizontal resource header, and a content canvas with 30px gutters. The full primary screen is an overview: heading, a 70:30 homestead-and-checklist split, a three-stat band, a 60:40 dungeon-and-war split, and a realm activity footer. The scene is the main focal point. Other requested game screens extend these same component families.

Mobile replaces the rail with a labeled menu drawer and stacks content in task order. Resource totals remain visible. Dialogs fit the viewport and scroll internally. No horizontal page scroll.

## Tokens

- Page background: dark green charcoal `#101615`, not white, cream, or navy.
- Rail / deeper surfaces: `#0d1312`; raised surfaces: `#161e1b`.
- Text: ivory `#eeeade`; secondary: `#a3ada4`; subdued: `#78867d`.
- Antique gold: `#d1af6d`; button text: `#1b2119`; border: `#344037`; gold border: `#62583d`.
- Positive: moss `#8fb78f`; danger: warm red `#cf8775`; faction colors: gold, green, terracotta, blue.
- Thin borders, 3–5px radii, restrained elevation. No large rounded app wrappers.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40.

## Typography

Cormorant Garamond, weight 500/600, for the brand and narrative headings. Inter for readable UI, resource figures, data, controls, and supporting prose. Display heading 40–44px desktop, 33px mobile; section titles 28px; UI 12–14px; field labels 10–11px with controlled tracking. Fonts bundled locally.

## Shared components

Flat bordered panels, icon-plus-label sidebar rows, thin resource dividers, gold filled primary buttons, outlined secondary buttons, text links with arrows, progress tracks, loot tiles with rarity labels, labeled status dots, list rows, focused modal dialogs, battle receipts, and toast feedback. Use Lucide outline icons at 18–22px and 1.5px stroke; the brand combines a crown and sword motif. Tactile hover lift only for interactive elements.

## Image treatment

The homestead scene has no overall color tint. A localized black-to-transparent lower edge gradient makes native copy readable, matching the reference. Dungeon imagery is full-color teal-green forest art with a lower edge fade when it carries interface copy. The treasure chest asset has its own dark studio-like background. No screenshots masquerade as interactive UI.

## Motion

Short page entrances, 180ms control transitions, soft battle progress, and a chest light reveal. The combat result is committed before animation. `prefers-reduced-motion` disables nonessential movement. Sound is optional and begins off.

## Working copy

Brand: ASH & OATH. Tagline: A REALM WORTH FIGHTING FOR. Navigation: Overview, Settlement, Army & Armory, Dungeons, War Room, The Trader. Main title: Every kingdom begins with a home. Supporting line: Build your legacy. Choose your allegiance. Survive the Sundering. Scene title: A small beginning. Main action: Expand your settlement. Checklist: Your next chapter; Swear an oath; Raise your banners; Into the unknown. Lower sections: Beyond your borders; The war never sleeps. The concept's illustrative season countdown and activity entries are replaced with real local state and a clear simulation label.

## Final concept comparison

The working concept and final browser capture were both inspected with `view_image` at the reference viewport, 1536 × 1024. In-app browser controls verified real interactions; its viewport-resized screenshots were clipped, so Playwright Chromium supplied the native-size visual evidence. The implementation was verified for faithful use of the working design, with the intentional adaptations below.

| Comparison point        | Implemented result                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Page palette            | Dark green charcoal background, ivory headings, antique gold controls, restrained green status labels              |
| Shell and layout        | 216px left navigation rail, horizontal resources, large home scene beside the chapter panel                        |
| Media framing           | Standalone full-color artwork; only the lower image edge fades for native text readability                         |
| Alignment and density   | Home and chapter panel both measure about 437px high; the activity strip ends inside the 1024px reference viewport |
| Typography and controls | Cormorant narrative headings, Inter UI labels, consistent thin borders and compact gold actions                    |
| Supporting sections     | Three-part strength band, dungeon preview, faction influence, and real realm activity follow the reference order   |
| Responsive continuation | Stacked sections, a focused navigation drawer, and viewport-fitting dialogs; no overflow at the checked widths     |

The main above-the-fold headings, navigation, and primary action match the specified copy. Intentional changes are the original standalone production art; a simple code-native crest and outline icon family; a Citadel step for the requested extended progression; a 28-day fresh local season; truthful simulation/save labels; and actual player activity instead of invented other-player events. UI controls use Inter as specified in this document rather than reproducing incidental serif text from the image. These adaptations are recorded parts of the working implementation, not a claim of literal pixel identity.

Material mismatches corrected during verification: the scene stretched to its intrinsic image ratio, the chapter and scene heights diverged, the overview’s lower bands fell too far below the reference viewport, and a broad footer selector split the wordmark. The final visual pass found no remaining clipping, overlap, missing-art, or responsive overflow defects in the inspected screens.
