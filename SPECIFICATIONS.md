# Portfolio renovation specification

Last updated: 2026-10-15.
Status: Active local implementation with full-screen homepage and project-page timelines, a shared overlay, synchronized homepage card carousels, a focus-driven Featured Themes system, responsive project grids, and cinematic dark sections.

## Current direction — 2026-09-15

The homepage and principal project pages share an active layout and interaction framework. The homepage uses full-screen sticky sections, a fixed overlay, horizontal card systems controlled by native horizontal input and page scroll, and a Featured Themes carousel whose focused theme separates into linked project cards. Homepage content blocks now reserve an entrance phase in which the section title yields the focus position directly to Card 0 while the carousel enters from outside the right edge. Project pages use a content-driven sticky block timeline, overview and content grids, project-specific overlay navigation, and cinematic dark sections. Visual refinement, the remaining two project-page conversions, and device-level responsive validation remain pending. The authoritative current implementation is recorded at the end of this document; earlier sections preserve the design history.

## Purpose and confirmed requirements

Redesign the portfolio from scratch in `/Users/ciel/Documents/PortfolioWebsiteRenovation`.
Use `/Users/ciel/Documents/Portfolio/Portfolio 2026` as a reference codebase and content library.
The previous design does not work well on mobile or across desktop screen sizes.
Maintain this Markdown specification throughout the project, recording requirements, design decisions, implementation details, and verification results as they develop.

## Source preservation

The original project remains unchanged. `reference/legacy-code/` contains a verified snapshot of its HTML, CSS, and JavaScript. `reference/ASSETS.md` inventories original media without duplicating it. This snapshot excludes Git history and is not a full project backup.

## Initial source audit

The original is a static HTML/CSS/JavaScript site with no package manifest found at its root.
Its homepage identifies Siyi Zhu as an HCI researcher.
The stylesheet uses absolutely positioned sections, viewport-based heights and offsets, and viewport-height-based column widths. These are responsive risk factors observed in code; browser testing has not yet been performed.
Several links have empty destinations, including the CV and some project entries. Review destinations before migration.

### Content available for migration

- Home: name, introduction, navigation, contact, and CV entry.
- Research: Immersive and Sensible Scholarly Sensemaking; Synthesis Infrastructure Foundation; Exploring Future Immersive Environments for Scholarly Sensemaking; Patterns of Hypertext-augmented Sensemaking; Metaverse-based Workspace for Research.
- Design: ResDash, Tangible Dial, Still Surviving.
- About: contact, education, work experience, publications, teaching, service, skills, and CV.
- Detail page: `Research/SensibleSensemakingXR/SensibleSensemakingXR.html`.
- Media: background image, research figures, and demonstration videos; see the asset inventory.

This inventory describes source content, not a commitment to the final navigation or copy. Biographical details and project status need review before publication.

## Proposed responsive acceptance criteria

- Start with a mobile layout and expand when content has room.
- Use normal document flow and flexible Grid/Flexbox layouts for primary content.
- Support widths from 320 CSS pixels through wide desktop displays without unintended horizontal scrolling, overlapping text, or clipped controls.
- Check representative widths: 320, 375, 390, 768, 1024, 1280, 1440, and 1920 pixels, plus intermediate widths and phone landscape.
- Use fluid spacing and typography with readable maximum content widths.
- Homepage sections fill the visible viewport. Keep content reachable on short screens and at increased text sizes through an intentional overflow treatment; never clip essential content. Detail pages may use content-driven heights.
- Make images and videos fit their containers and preserve intended aspect ratios.
- Provide navigation and project access for touch, mouse, and keyboard.
- Preserve usability at 200% text zoom, visible keyboard focus, semantic headings, meaningful image alternatives, and reduced-motion preferences.
- Avoid loading all demonstration videos eagerly; define media loading and fallback behavior during implementation.

## Historical homepage interaction specification — deferred

### Confirmed requirements

- The homepage consists of consecutive full-screen sections; each section takes one visible screen.
- Scrolling some distance triggers a jump to the next section, rather than continuously moving through the whole page.
- A full-screen overlay sits above the section content and serves as both navigation and a progress indicator.

### Proposed behavior

These details interpret the requirements and remain adjustable during prototyping.

- Hold the active section in place while accumulating directional scroll input. Crossing a configurable threshold triggers a transition to the adjacent section.
- Scrolling down advances; scrolling up returns to the previous section. Stop at the first and last sections without wrapping.
- Reset accumulated input on direction reversal or a pause. Normalize wheel input so mouse wheels and trackpads behave consistently.
- Advance at most one section per intentional gesture. Ignore residual trackpad momentum during and immediately after a transition so a single gesture cannot skip sections.
- Support equivalent touch swipes and keyboard navigation. Overlay navigation can jump directly to a chosen section without requiring accumulated scroll input.
- Preserve normal interaction with links, controls, text selection, and any scrollable content. If section content overflows, let the user scroll that content before initiating a section change at its boundary.
- Keep the URL fragment, active navigation item, visible section, and progress state synchronized. Direct links and browser back/forward navigation should restore the appropriate section.
- Honor reduced-motion preferences with immediate or minimal-motion transitions while retaining section navigation.

### Full-screen navigation and progress overlay

- Keep a persistent overlay fixed to the viewport above every homepage section; it remains in place when the underlying section changes.
- Treat the overlay as a navigation layer, not a modal dialog. Its empty areas allow interaction with the underlying section, while navigation controls receive pointer and keyboard input.
- Show the current section and allow direct navigation to other sections.
- Indicate overall progress through the sequence. Proposed: discrete section positions plus a local fill showing accumulated scroll toward the next jump; reset the local fill after transition or canceled input.
- Maintain readable contrast over every section background, visible focus states, and comfortable touch targets.
- Account for phone safe areas and browser chrome. Reserve space in each section for overlay controls so they do not cover essential content.

### Parameters and visual decisions still open

- Final section names, count, order, and content.
- Scroll/swipe threshold and idle reset timing, to be tuned on actual input devices.
- Jump treatment: instant cut or short animated transition; duration and easing remain undecided.
- Overlay composition, typography, colors, and the visual form of the progress indicator.
- Exact treatment of content that cannot fit in one screen on small displays or at increased text sizes.

### Interaction verification plan

Check wheel, trackpad, touch, and keyboard input; below-threshold input; direction reversal; one-section-per-gesture behavior; first/last boundaries; direct navigation; browser history; resizing and orientation changes; overflow content; overlay click-through; reduced motion; and text zoom. Verify the visible section and progress remain synchronized throughout.

### Previous prototype (2026-09-11; removed 2026-09-13)

- Files: `index.html`, `styles.css`, and `navigation.js`; no runtime dependencies or build step.
- Four initial screens: Home, Research, Design, About. Content is a selected subset of the reference portfolio, not a complete migration. Projects without destinations are plain text.
- Full-screen fixed navigation overlay with active links, previous/next buttons, section counter, overall progress, and desktop gesture fill.
- Wheel threshold: 180 normalized pixels. Idle reset: 180 ms. Touch threshold: 80 CSS pixels. Transition: 550 ms with a 600 ms navigation lock; reduced-motion transitions are disabled.
- One transition per continuous wheel gesture or touch swipe. Reverse direction, boundary handling, keyboard navigation, hash links, and browser history are implemented.
- Overflow scrolls within a full-screen section. Keyboard controls scroll overflowing content before advancing. A touch gesture that scrolls content requires a fresh swipe to change sections.
- Inactive screens are inert and hidden from assistive technology. A live region announces changes. The overlay passes pointer input through empty areas.
- CSS includes mobile navigation and short-desktop adaptations; native document flow remains available without JavaScript.
- Initial visual treatment uses large typography, a pale neutral background, and dark green accents. This is a provisional design for the structural prototype.
- Publication: local only, per user instruction. Preview at `http://127.0.0.1:8000/` while the development server is running.

### Validation and remaining work

- JavaScript parsed successfully.
- `tests/navigation.test.cjs` passed using a simulated DOM: thresholds, momentum, reverse direction, boundaries, direction resets, buttons, inert state, progress, keyboard overflow, history, and touch navigation.
- HTML IDs, local fragment targets, and asset paths were checked. Local homepage returned HTTP 200. `git diff --check` passed.
- These automated checks do not validate actual browser rendering or device event behavior. No browser was available through the preview tool; visual responsive checks, real trackpad/touch tuning, zoom, and assistive-technology checks remain pending.
- Final visual design, full content migration, media, and detail pages remain outside this structural implementation.

## Design specification to develop

Record the audience and primary visitor task, information architecture, page content, typography, colors, spacing, grid, component states, navigation behavior, responsive changes, media treatments, and motion here as decisions are made.

Visual direction, framework, final routes, and hosting are currently undecided. The original blue palette, typography, and scroll effects are reference material only.

## Delivery sequence

1. Establish the reference library and content inventory — complete.
2. Develop the new design direction and page structure — in progress.
3. Specify reusable components and responsive behavior — in progress.
4. Prepare plain HTML content — complete for current content subset; full migration pending. UI implementation deferred.
5. Verify layouts, navigation, links, accessibility, and media behavior — pending.
6. Record final implementation and publishing details — pending.

## Decision log

| Date | Decision | Basis |
| --- | --- | --- |
| 2026-09-15 | Add Featured Themes as a homepage carousel with XR, Sensemaking, and Remote Working themes that split into linked project cards when focused. | Explicit user requirement. |
| 2026-09-15 | Trigger a theme split 50ms after it reaches the exact focus anchor; clicking a theme moves it to focus, leaving focus immediately starts the reverse animation, and hover does not control splitting. | Explicit user refinement. |
| 2026-09-15 | Treat the block title as the virtual focus before Card 0, then snap Card 0 directly to the shared `30vw` focus anchor without an intermediate offset. Apply the same No.0 entrance to regular homepage carousels. | Explicit user refinement. |
| 2026-09-14 | Use content-driven sticky blocks for project pages, with 50vh of scroll space before and after regular block content. | Explicit user requirement. |
| 2026-09-14 | Use black cinematic terminal blocks for Related Projects; keep Contact only on the homepage as its footer. | Explicit user clarification. |
| 2026-09-14 | Fade the whole document background during transitions into and out of dark blocks. | Explicit user requirement. |
| 2026-09-14 | Provide overlay focus-on-content, focus-on-overlay, and always-clear modes. | Explicit user requirement. |
| 2026-09-14 | Use timeline-aware, ease-in-out navigation rather than native anchor scrolling. | Native fragment positions do not represent the custom scroll timeline. |
| 2026-09-13 | Remove UI and custom interactions; show plain HTML content only. | Explicit user request; supersedes current full-screen prototype. |
| 2026-09-11 | Develop in the renovation workspace and preserve the original project. | User supplied a separate reference project. |
| 2026-09-11 | Design from scratch; reuse legacy material selectively. | Explicit user requirement. |
| 2026-09-11 | Maintain this specification as the project develops. | Explicit user requirement. |
| 2026-09-11 | Use full-screen homepage sections with a scroll threshold that triggers section jumps. | Explicit user requirement. |
| 2026-09-11 | Place a persistent full-screen navigation and progress overlay above the sections. | Explicit user requirement. |
| 2026-09-11 | Keep the structural prototype local. | Explicit user preference; no deployment. |

## Verification log

- 2026-09-15: Confirmed `layout.js`, `featured-themes.js`, and `galaxy-background.js` parse successfully. Checked local HTML destinations and fragments, CSS brace balance, trailing whitespace, and `git diff --check`. Browser and physical-device validation remain pending.

- 2026-09-13: Checked the plain HTML page has no stylesheet, scripts, navigation, buttons, or styling attributes; headings, lists, and existing content links remain.

- 2026-09-11: Inspected original source structure and homepage content.
- 2026-09-11: Copied original HTML/CSS/JS and verified copies using SHA-256.
- 2026-09-11: Implemented the local homepage prototype and passed simulated navigation and source checks. Browser/device validation remains pending.

## Version control

The renovation workspace uses a local Git repository with `main` as the initial branch. The initial baseline includes documentation, the legacy code reference, the asset inventory, and the empty homepage placeholder. No remote has been configured.

## Documentation maintenance

Update this file whenever requirements, design, implementation, or validation change. Distinguish confirmed requirements from proposals, record unresolved choices, and document known issues. Add detailed Markdown documents when needed and link them from this specification.

## Project pages — 2026-09-13

Created five research pages in `research/` and three design pages in `design/`. The homepage links to every project, including Synthesis Infrastructure Foundation and Metaverse-based Workspace for Research, which were previously only in the reference inventory. Each page has a unique title, project heading, category, and a plain return link to its homepage category.

Research descriptions and publication links were copied from the original homepage where available. Design pages retain the original project dates. Synthesis Infrastructure Foundation has no substantive description in the source; its filler text was omitted. Historical ongoing statuses were omitted pending review. No new project claims were invented. The longer XR case study and media remain in the reference library for later migration.

All pages remain unstyled HTML without scripts, custom navigation, or custom scrolling. Verified unique page titles/headings, all local links and fragments, and absence of styles/scripts across the nine active pages.

## Planned sticky block layout — 2026-09-13

Status: Planning only; no layout implementation yet. This replaces the earlier scroll-threshold jump proposal when UI layout work resumes. Visual styling is out of scope.

### Confirmed measurements

The user confirmed that 150vh means the total block container height, not 150vh of stationary scrolling. Each visible screen is 100vh tall. A sticky screen inside a 150vh container therefore has 50vh of fixed scrolling. Between adjacent blocks, reserve a separate 10vh scroll-driven transition interval.

Expose shared configurable values for screen height (100vh), block container height (150vh), and transition distance (10vh). Derive the sticky hold distance from container height minus screen height rather than hardcoding 50vh. Keep these values centralized so the user can adjust timing later. Container height must be at least screen height; handle a zero transition distance without division by zero.

### Planned behavior and scope

- Initial homepage blocks: Home, Research, Design, and About/contact.
- Use native scrolling and sticky full-screen content. Transition progress follows scroll position and reverses with scrolling.
- Treat the 10vh as the transition interval between blocks, not a required blank visual gap. Use only the movement needed to demonstrate layout, without visual design work.
- No navigation overlay, custom typography, colors, decorative components, or new visual styling in this phase.
- Keep the separate project pages as plain HTML documents.
- Do not add an outgoing transition after the final block.
- Before implementation, derive and document wrapper geometry to avoid accidentally adding another viewport of travel between holds. Verify the resulting 50vh hold and 10vh transition at the default settings.
- During implementation, address viewport resizing/mobile browser chrome, content taller than the visible screen, and reduced-motion behavior without hiding content.

The earlier proposed timeline of a 150vh hold followed by a 10vh transition is superseded. The user requested planning first; implementation remains pending.

## Sticky block implementation — 2026-09-13

Implemented homepage layout only in `layout.css` and `layout.js`. Project pages, copy, typography, colors, and native link/list styling are unchanged. The homepage now groups existing content into Home, Research, Design, and About/contact blocks.

Settings in `layout.css`: `--block-height: 150` and `--transition-height: 10`, expressed as viewport percentages. The visible stage remains 100% of the current viewport. Hold distance is `(block height - 100) / 100 × viewport height`; transition distance is `transition height / 100 × viewport height`.

One sticky stage contains the screens. Its outer scroll container is `100vh + 4 × 50vh + 3 × 10vh = 330vh` at defaults, giving 230vh of scroll travel. This implements the agreed block timing without adding redundant viewport travel for each nested wrapper.

Default scroll timeline: Home hold 0–50vh; transition 50–60vh; Research hold 60–110vh; transition 110–120vh; Design hold 120–170vh; transition 170–180vh; About hold 180–230vh. There is no outgoing transition after About.

Movement is a reversible vertical slide directly tied to native scroll position. Reduced motion switches screens without sliding. Screen content can scroll internally if it exceeds the viewport. Inactive blocks are inert; project return links restore the appropriate homepage block by fragment. Viewport resizing recalculates distances. Without JavaScript and when printing, content remains in normal document flow.

Visual browser/device validation remains pending. No navigation overlay or visual theme was added.

Validation: JavaScript syntax and simulated scroll checks passed for total geometry, hold intervals, transition midpoints, reverse scrolling, final hold, and reduced motion. `git diff --check` passed. These checks do not substitute for browser rendering and real-device validation.

## Homepage block content alignment — 2026-09-13

Each homepage block vertically centers its content within the visible viewport and places the content's left edge 30vw from the viewport's left edge. The shared `--content-left: 30vw` setting in `layout.css` keeps the horizontal position adjustable. If a block's content becomes taller than the viewport, safe centering lets it begin at the top of its scrollable block instead of clipping the beginning. Print layout returns the content to normal document flow without the viewport offset.

## Horizontal item cards — 2026-09-13

Research and Design now show one card per project in horizontally scrolling rows. About uses three cards for the existing biography, email, and LinkedIn content. Each row is a labeled, keyboard-focusable region, supporting native horizontal scrolling with touch, trackpad, scrollbar, and keyboard. Vertical scrolling continues to drive the existing block transitions; there is no wheel-event interception.

Cards use a minimal border and padding with browser-default typography and link colors. `--card-width: 22rem` and `--card-gap: 1rem` control the layout. Card width is capped at 85% of the available row width on narrow screens, and long text wraps. Rows retain their full content height so tall content can scroll within the section. Printed cards stack vertically. Project destinations and standalone project pages are unchanged.

## News and separate Contact section — 2026-09-13

The current homepage order is Home → Research → Design → News → About → Contact. News sits between Design and About and currently contains only its heading, pending supplied news content. Contact is its own full-screen block containing the existing email and LinkedIn cards; About retains the biography card.

Typography update: all active pages use Helvetica via the shared `typography.css`, with Arial and sans-serif fallbacks when Helvetica is unavailable. Font sizes and weights retain their existing values. The original reference library remains unchanged.

Card dimensions update: all cards now have equal width and height of 35vh, controlled by `--card-size`. This replaces the earlier 22rem width and 85% narrow-screen cap. Rows scroll horizontally to accommodate the fixed card dimensions. Card content can scroll internally when it exceeds the fixed height.

Corner radius is twice the H1 font size: `--card-radius: calc(2 * var(--h1-font-size))`. H1 uses the shared `--h1-font-size: 2rem` token in `typography.css`, giving a default radius of 4rem. Here “font height” is interpreted as CSS font size. Changing the H1 token also updates the card radius.

Card text update: each card has 4vh padding on all sides, uppercase text via CSS, and content grouped at the bottom using a column flex layout. Safe bottom alignment falls back to top alignment when content exceeds the available height so all text remains reachable through internal scrolling. Text and link destinations retain their original values; uppercase is a presentation rule only.

Link styling update: all hyperlinks across the homepage and project pages omit the default text underline through the shared `typography.css` stylesheet.

## News placeholders — 2026-09-13

The News section contains four placeholder cards derived from dated entries in the legacy About section: the 2025 Creativity & Cognition publication, the 2024 UIST publication, the 2024–2026 User-Centered Design teaching assistant role, and the 2024–2026 Speaker Series Coordinator role. Publication cards link to their existing research project pages. Every card visibly says “Placeholder news item” so these entries are not mistaken for finalized news copy. The cards inherit the shared horizontal row, dimensions, uppercase treatment, bottom alignment, and spacing.

Horizontal card overflow update: card rows no longer use a native `overflow-x` scroll container because native scrolling necessarily clips children at the container boundary. Each row now has `overflow: visible` and contains a translated card track. Cards can move outside the row boundary and remain visible until the full-screen stage clips them at the viewport edge.

Horizontal track interaction supports trackpad horizontal deltas, Shift+wheel, left/right/Home/End keys on the focused row, and pointer dragging for mouse, pen, and touch. Vertical wheel and touch movement remain available to the page. The track clamps at the first and last cards and recalculates its range when resized. There is no row scrollbar. This custom interaction requires browser and touch-device validation.

All six blocks use the existing centering, 30vw horizontal offset, and scroll timing. The layout script derives geometry from the section count: at defaults the total container is now 450vh, with 350vh of scroll travel (six 50vh holds and five 10vh transitions). Contact is the final block and has no outgoing transition. The existing fragment navigation also supports `#news` and `#contact`.

## Current implemented design — 2026-09-13

This section is authoritative for the current prototype. Earlier implementation sections document superseded stages.

### Site and content structure

- The project is a dependency-free static website. The homepage uses `index.html`, `layout.css`, `typography.css`, `overlay.css`, `featured-themes.css`, `galaxy-background.js`, `overlay.js`, `featured-themes.js`, and `layout.js`.
- The homepage order is Home → Featured Themes → Research → Design → News → Experience → Contact.
- All seven homepage sections are children of one `.block-stage` inside `main`.
- Five standalone research pages live in `research/`; four standalone design pages live in `design/`.
- Seven project pages use the project timeline framework. The Metaverse Workspace and Synthesis Infrastructure Foundation pages currently retain plain document flow with static Related Projects footers.
- The legacy project snapshot and asset inventory remain under `reference/`.

### Full-screen block timeline

- `.block-stage` is sticky at the top of the viewport and fills `100dvh`, with a `100vh` fallback.
- Every `.layout-block` occupies the stage and is moved vertically according to native document scroll position.
- `--block-height: 250` produces a default `150vh` stationary hold because the visible `100vh` is subtracted from the configured block height.
- `--transition-height: 50` reserves `50vh` between adjacent holds for the vertical section transition.
- A block may override the default hold with `data-block-hold`. Featured Themes currently uses a `500vh` hold; the other six blocks use the default `150vh` hold.
- The seven-block homepage produces an `1800vh` main container and `1700vh` of total page travel: `1400vh` of holds, six `50vh` transitions, and one visible viewport.
- The final Contact block has a hold but no outgoing transition.
- Section motion reverses naturally when the user scrolls upward.
- Inactive blocks are `inert` and `aria-hidden`; the active block changes at the midpoint of a transition.
- Fragment links restore the matching block. Resizing recalculates viewport-based distances.
- Reduced-motion mode switches the active screen without the vertical slide.

### Main alignment and typography

- Homepage block content is vertically centered when it fits. Taller content can scroll vertically inside its block.
- The main content origin is `30vw` from the left edge through `--content-left: 30vw`.
- Helvetica is the primary typeface, followed by Arial and the generic sans-serif fallback.
- H1 size is `2rem`; H2 size is `3rem`.
- Links inherit parent colors in every state and have no underline.

### Fixed overlay

- `.site-overlay` is fixed to all four viewport edges with a z-index above the page.
- The overlay grid uses `15vw 15vw 1fr`: navigation occupies the first `15vw`, the second `15vw` is open space, and the right section begins on the shared `30vw` content line.
- The overlay itself ignores pointer input; interactive descendants opt back in so underlying cards remain usable.
- The left column contains the vertical navigation for Home, Featured Themes, Research, Design, News, Experience, and Contact.
- Navigation begins `30vh` from the top, sits `1vw` from the left edge, and uses a `5vh` gap between links.
- During the `50vh` section transition, the outgoing navigation label interpolates from its enlarged bold state to its base state, while the incoming label performs the inverse. The interpolation follows scroll position.
- The right column has three vertical regions: the name in the header, an empty information region in the middle, and a footer at the bottom.
- The middle information region is reserved for later focused-card information. It is `30vw` wide, aligned toward the right, and has a `20vw` right margin.

### Galaxy background

- Two fixed canvas surfaces sit behind the content and in front of the content but below the overlay. Their short vertical lines use the current overlay foreground color, so they invert with cinematic document-background transitions.
- The background surface uses three density/parallax layers with `1px` strokes. The sparse foreground surface uses one faster parallax layer with `3px` strokes.
- Line movement runs opposite the page-scroll direction through the parallax offset. Directional stretch extends only in the direction implied by each layer's displacement, is capped at `220px`, and decays after input stops.
- `focus-on-overlay` applies the same `25px` content blur to both galaxy surfaces. `overlay-always-clear` removes that blur. Reduced-motion mode disables parallax and directional stretching.

### Card system geometry and content

- Research, Design, News, and Experience each use a `.card-system` wrapping a native horizontal `.card-row`, `.card-track`, and stationary dot indicator. Featured Themes uses its own compatible full-width carousel. Contact is a separate cinematic homepage footer block.
- The card system is `100vw` wide and `80vh` high. Its negative left margin aligns it to both viewport edges despite the block's `30vw` content offset.
- Native horizontal overflow remains enabled; scrollbars are hidden.
- Cards are `35vh × 35vh` with `4vh` internal padding, a black background, white uppercase content, and bottom-aligned text.
- Card corner radius is twice the H1 font size, currently `4rem`.
- Card links inherit the card's white text color.
- Project cards have year text in their wrapper above the card. The year is bold, `2vh`, uppercase, and inset from the left by the card radius.
- Cards have no shadow.
- News cards are `1.25` times the base height and use half the default carousel radius. Experience cards are `1.5` times the base height, use a `5vw` native gap, and have typography tuned for roles, institutions, dates, and details.
- Desktop and laptop widths from `768px` through `1600px` reduce the base carousel corner radius from twice the H1 size to one H1 size.

### Optional card effects

- `card-scroll-effects` is a per-block class. Removing it leaves that block's carousel horizontally scrollable with static cards.
- Research, Design, and News currently enable the effects. Experience uses vertical-to-horizontal synchronization without the scale, blur, brightness, or layer effects. Contact is not a carousel.
- The focused card is scaled to 150%.
- At one card away, scale is 90%; subsequent distance steps reduce scale by 10 percentage points to a 10% minimum.
- Brightness is 100% when focused, 80% one step away, and reduces by 10 percentage points per subsequent step to 0%.
- Blur is 0 when focused, 2px one step away, then increases by 6px per subsequent step to a 50px maximum.
- The focused card has the highest layer. Layer depth decreases with distance.
- Animated right-side gaps increase by `10vw` per distance step. Animated left-side gaps decrease by `10vw` per step. The current animated base-gap token is `-7vw`; the native track gap is `10vw`.
- Cards left of focus move downward using the current viewport-height sequence `[0, 2, 4, 8, 16, 24, 28, 30, 31]`.
- The wrapper transform and blur also affect its year label. Brightness remains on the card itself.
- Only a focused card link participates in sequential keyboard focus while effects are enabled. Clicking a nonfocused card first moves it into focus.

### Dot indicators

- Each card system has one generated dot per card at its bottom-right corner, inset `2vw` horizontally and `2vh` vertically.
- Dot emphasis follows the fractional horizontal position. The nearest dot reaches full opacity and 150% scale.
- Dots are buttons with descriptive card labels and can move directly to their card.
- A one-card carousel hides its indicator.
- Indicators continue to follow native scrolling when visual card effects are disabled.

### Vertical and horizontal carousel synchronization

- `card-vertical-scroll` is a per-block class that maps only that block's vertical hold progress to its horizontal carousel.
- Research, Design, News, and Experience have vertical synchronization enabled.
- Each applicable block reserves up to the first `125vh` of its hold for its entrance. The remaining hold distance maps continuously from the first card to the last card.
- The outgoing carousel remains on its last card throughout the following `50vh` section transition. Scrolling elsewhere does not change it.
- Scrolling upward reverses the carousel after the user re-enters its block timeline.
- Direct horizontal scrolling, dot clicks, and keyboard card navigation update the matching vertical page position. Synchronization guards prevent feedback loops.
- Vertically controlled rows disable native CSS scroll snapping so intermediate scroll positions remain continuous.

### Homepage block entrance and No.0 focus

- Every homepage block after Home and before Contact receives the shared entrance treatment. `--block-entrance-height: 125` budgets the first `125vh` of that block's hold for this phase.
- The block title begins vertically centered as the first focused object and moves with cubic smoothstep easing to its normal position above the carousel.
- At the same time, the full carousel begins one viewport width beyond the right edge and enters the viewport.
- Card layout uses an internal virtual focus value from `-1` to `0`. The title occupies the focus anchor at the start, and the first card progressively takes over that same `30vw` anchor.
- There is no separate `10vw` or other staging offset. When the entrance settles, Card 0 is directly at the normal focused position.
- Pausing during the entrance snaps to one of its two endpoints: title focus at the block start or Card 0 focus at the end of the entrance. It never snaps to an intermediate staging position.
- Reduced-motion mode resolves the entrance immediately at Card 0.

### Featured Themes carousel and split interaction

- Featured Themes contains three parent themes: XR, Sensemaking, and Remote Working. Metaverse-Based Workspace for Research belongs to Remote Working.
- Before a split, parent themes use the same 150% focused scale, distance-based scale reduction, brightness, blur, layering, and left/right gap model as the regular animated carousels. Its base and distance-step gaps are both `10vw`.
- Page scroll, horizontal wheel input, touch swipes, arrow/Home/End keys, theme clicks, and indicator controls can move the theme carousel. Clicking a nonfocused theme requests a smooth page-timeline move to its exact focus position.
- A theme starts splitting 50ms after it reaches the exact focus position. Hover does not trigger or preserve the split.
- Leaving the exact focus position immediately starts the existing `450ms` ease-in-out reverse split animation. Scrolling away from the block also exits the split. The reverse transition remains visible rather than removing the project cards instantly.
- During a split, the parent card surface disappears while its H1 label remains. Linked project cards emerge around the theme's in-place position; the theme itself does not move to a separate split location.
- Nonactive theme cards remain visible and are pushed horizontally away from the active theme. Project placement uses deterministic variation plus collision checks to avoid the block title, the other themes, the active label, sibling project cards, and viewport boundaries.
- One SVG surface draws the active theme and project-card membranes with a Gaussian-blur/color-matrix metaball filter. HTML text and hit areas stay above the SVG, so foreground cards occlude text behind them and labels remain interactive.
- Project cards are approximately 80% of the base card size, constrained by available stage height and width. Their year labels travel with them, and their project names are left aligned and vertically centered.
- Project links become interactive only after the split is effectively complete. Escape starts the reverse animation and returns focus to the carousel region.
- Reduced-motion mode removes the metaball interpolation and resolves state changes immediately.

### Card snapping

- When scrolling pauses inside a vertically controlled card hold, the page and carousel settle on the nearest exact card position.
- Snapping does not run in the `50vh` section-transition interval.
- `--card-snap-delay: 60` waits 60ms after input before beginning the snap.
- `--card-snap-duration: 500` completes the current snap animation in 500ms.
- The snap uses a symmetric cubic ease-in-out curve.
- Wheel, touch, pointer, or keyboard input cancels an active snap.
- Reduced-motion mode performs the snap immediately.
- Featured Themes snaps to the nearest exact theme position after its entrance phase, then applies the same 50ms focus delay before opening the split.

### Current limitations and pending work

- The final visual refinement, mobile overlay treatment, related-project links, and overlay information-area content remain open.
- Fixed viewport-relative card sizing and 150% focus scaling require mobile and short-screen tuning.
- The Sense and Senseability and Exploring Future Immersive Environments cards currently point to the same project page.
- Tangible Dial currently appears in both Research and Design; confirm whether this classification is intentional.
- The animated gap token and native track gap intentionally remain separate in code but currently use conflicting base values (`-7vw` and `10vw`); review during carousel tuning.
- Real-device trackpad and touch tuning, text zoom, and assistive-technology behavior remain to be validated.

### Current verification

- HTML nesting, unique IDs, and local fragment targets have passed source checks.
- Existing internal project-page targets resolve.
- `layout.js` passes JavaScript syntax validation.
- CSS brace checks and `git diff --check` pass.
- Timeline calculations and nearest-card snap calculations have been inspected with representative values.
- Headless browser navigation checks confirmed that direct navigation traverses intermediate timeline blocks on both the homepage and a project page. Full visual and physical-device validation remains pending.

## Current project-page system — 2026-09-14

This section is authoritative for project pages. Research pages load `research/project-layout.css` and `research/project-layout.js`; design pages load equivalent shared files under `design/`. The shared `overlay.css` and `overlay.js` apply to the homepage and framework project pages.

### Opening block

- The opening block is configured as `140vh`, producing `40vh` of page travel behind a sticky `100vh` viewport.
- At the opening position, the title, year, and publication venue occupy `100vh` and align to the bottom with `30vh` bottom padding.
- Across the first `10vh` of scroll, the title section shrinks from `100vh` to `60vh` and its bottom padding shrinks from `30vh` to `5vh`, revealing the `40vh` overview below it.
- The overview uses four equal columns. The abstract or summary spans the first two columns; two custom fact cells occupy the remaining columns and center their content horizontally and vertically.
- Desktop project content begins `30vw` from the viewport's left edge. The mobile breakpoint changes the inset to `5vw`.

### Regular blocks and grids

- Regular blocks transition vertically across `20vh` and remain inside one clipped sticky viewport.
- A regular block's default hold equals its rendered content height plus `50vh` before and `50vh` after the content. A `data-project-hold` value overrides that measured duration for cinematic scenes.
- Content grids are four columns by three rows, fill `100%` of the available parent width, and are `60vh` high with a `2rem` gap.
- `.span-columns-2`, `.span-columns-3`, `.span-columns-4`, `.span-rows-2`, and `.span-rows-3` let a cell span multiple tracks.
- Every grid cell has a `2vh` corner radius. Cells containing copy use a light gray background; media cells preserve their media treatment. Images fill their cell and may opt into `object-fit: contain` with `.media-contain`.
- At widths below `768px`, grids use two columns, automatic rows, and vertical overflow when necessary. Larger spans collapse to the full mobile width.
- Project pages do not use the homepage card carousel unless it is explicitly added later.

### Cinematic dark sections

- Immersive and Sensible Scholarly Sensemaking includes a custom `900vh` Introduction hold with scroll-driven text scenes and separately positioned background images.
- Every framework project page ends with a black Related Projects block using a `300vh` hold and a scroll-driven entrance scene. The two plain research pages use a static full-height black Related Projects footer.
- The document background, sticky stage, overlay foreground, and adjoining block transition interpolate together when entering or leaving a dark block. This prevents a white document layer from showing during the transition.
- Contact exists only on the homepage. Its black terminal block uses the same footer-like visual role as Related Projects on project pages.
- Related Projects and homepage Contact activate `overlay-always-clear`: overlay text and page content remain sharp with no focus blur.

### Project overlay and focus states

- The fixed overlay uses columns of `15vw`, `15vw`, and the remaining width. Navigation occupies the first `15vw`; the right overlay section begins `30vw` from the left edge.
- The vertical navigation starts `30vh` from the top, sits `1vw` from the left edge, and has a `5vh` item gap. Project navigation reflects the current project's blocks and includes a Home link near the right header.
- Overlay text uses `1.25rem`. Active navigation labels grow by up to `0.5rem` and interpolate from weight 400 to 700 through block transitions.
- `focus-on-content` gives noncurrent overlay elements 70% opacity and a `5px` blur while leaving the current navigation item clear.
- `focus-on-overlay` makes overlay elements sharp and applies a `25px` blur to `main`, five times the overlay's unfocused blur.
- Overlay hover, keyboard focus, and page scrolling faster than `12px/ms` activate overlay focus. Rapid-scroll focus remains for `600ms` after the last qualifying event.
- A pointer-clicked overlay control releases browser focus so it does not remain focused after the cursor leaves. Keyboard activation retains focus.
- Hovering the highlighted navigation item explicitly selects content focus, overriding the navigation container hover and rapid programmatic scrolling. A mutation observer updates the state as soon as `aria-current` moves to the jump destination.

### Timeline-aware navigation

- Homepage and framework project navigation compute destinations from their custom scroll timelines instead of relying on the absolute sections' native document positions.
- Direct jumps use a cubic smoothstep ease-in-out curve. Duration starts at `550ms`, grows with the square root of the viewport distance, and is capped at `3500ms`.
- Wheel, touch, pointer, or keyboard input cancels a running programmatic navigation animation.
- Hash state, browser history, active navigation emphasis, `aria-current`, visible block state, and the scroll timeline stay synchronized.
- Reduced-motion mode performs immediate navigation and switches scenes without sliding.

### Project content and assets

- Future Work was added as a fourth design project using material from the legacy GitHub portfolio.
- ResDash describes a UC Health resident-doctor evaluation and longitudinal performance-tracking system. Its current page uses supplied project context and awaits the user's later Figma-directed refinement.
- Sense and Senseability and Patterns of Hypertext-Augmented Sensemaking include text and figures extracted from the supplied publications.
- Still Surviving, Tangible Dial, Future Work, Sense and Senseability, and Hypertext-Augmented Sensemaking use local project images under `assets/` with descriptive alternative text and lazy decoding.
- The site remains local and dependency-free. No remote or deployment is configured.

### Current project-page limitations

- Metaverse-based Workspace for Research and Synthesis Infrastructure Foundation still need conversion to the full project-page timeline.
- Related Projects currently provides the terminal scene structure but does not yet contain project recommendations or links.
- The duplicated research and design layout files should remain behaviorally aligned until a later refactor consolidates them.
- Mobile overlay composition, short-screen grid density, media loading, text zoom, keyboard traversal, and real touch behavior need device-level validation.

## Dissertation content integration — 2026-10-15

Integrated the prepared kit at `reference/Raw Material/dissertation-portfolio-kit/` into the existing local website. Source copy, inert integration templates, originals, and review artifacts remain unchanged in the reference folder. Changes build on the working directory's pre-existing uncommitted implementation.

### Content and naming

- `research/immersive-scholarly-sensemaking.html` now presents **Sense-able Scholarly Sensemaking**. Its overview and eight previously empty research/design blocks contain the Chapter 5 narrative, figures, researcher role, formative participant insights, final interaction workflow, and provisional design contributions. Chapter 6 is a new **Future work** block between Discussion and Related Projects, with a matching timeline navigation entry. The proposed field study and companion web interface are identified as future work.
- `research/hypertext-augmented-sensemaking.html` combines the new Chapter 3 framing with the existing Study and Incubators content. The sample is described as 16 core hypertext users plus seven supplementary participants. The implications block includes the researcher's role.
- `research/future-immersive-environments.html` combines the Chapter 4 method and toolkit with the existing detailed speculative concept descriptions and a new concluding Contribution block. The artwork exploration is distinguished from the systematic literature review, and speculative concepts are distinguished from validated system benefits.
- At the user's request, the 2025 project is displayed as **Sense and Sense-ability**. This overrides the content kit's spelling guideline for site copy. Reference sources and original publication files retain their original wording.
- The homepage placeholder bio is replaced with the supplied research bio. The three research cards include the kit summaries; Featured Themes and related-project labels use the same project names. The duplicate 2023 card pointing to the 2025 speculative project is removed. Existing routes remain stable.
- The immersive venue now states `UIST 2026 demo · Accepted in dissertation proposal`; this is source-snapshot metadata, not a fresh verification of publication status. No missing DOI or author list was invented.

### Media and reading layout

- Copied the kit's 32 full-size WebP images and their smaller variants to `assets/dissertation/`. The accompanying `source-manifest.json` preserves the package's provenance, captions, dimensions, checksums, and credit information. Its paths remain relative to the reference kit. No new license is assigned.
- Used selected figures with intrinsic dimensions, responsive `srcset`, meaningful alt text, lazy loading, captions in document flow, and links to full-size media. Additional representation and interaction explorations appear under native disclosure controls.
- Added `research/dissertation-content.css`, loaded only by the three case studies. It provides two-column desktop reading areas, a single-column mobile layout, bounded content scrolling, visible keyboard focus, uncropped figures, and print styles. Existing cinematic selectors and the shared timeline implementation were not edited.
- During active reading sections on mobile, the overlay navigation becomes a horizontally scrollable bottom bar and the Home link stays at the top. The cinematic introduction retains its original overlay layout. Mobile spacing reserves room for these controls and safe-area insets.

### Preservation and verification

- Compared the immersive cinematic region against a snapshot of the working file taken immediately before integration. It is identical except for the two requested project-name spelling corrections in its existing project link and citation. Text scenes, quotations, media paths, timing attributes, hold duration, and Introduction navigation entry otherwise remain unchanged.
- `research/project-layout.css` and `research/project-layout.js` are byte-identical to the pre-integration working files. Future work and Contribution use the existing dynamic section registration pattern.
- Static checks across the homepage and all nine project pages passed: HTML nesting, unique IDs, local resource paths, local fragment destinations, navigation registration, heading references for edited content, image dimensions, alt text, and lazy loading. The pre-existing cinematic `aria-labelledby` reference to its commented-out title was deliberately preserved.
- All 32 full-size WebP copies match the reference kit byte-for-byte. Reference kit contents were not modified.
- Browser visual, interaction, reduced-motion, touch, and text-zoom checks remain **unverified**: the in-app browser was unavailable, and Safari Computer Use access was denied because Accessibility/Screen Recording permissions were not granted. Responsive CSS has been implemented and inspected statically; it is not a claim of device-tested acceptance.

### Follow-up: content height for the methods section — 2026-10-15

At the user's request, the immersive page's `#project-section-four` now hugs its content through an opt-in `data-project-content-height` attribute. The section uses `height: auto` with its bottom inset released; its heading and content area have no internal scrolling or height cap. Other dissertation sections retain their existing sizing.

The shared research timeline now measures overflow only for sections carrying that attribute and moves their content upward through the clipped viewport during the section hold. Incoming and outgoing offsets use viewport pixels for these sections so shorter natural-height blocks do not appear early during transitions. Existing sections, including the cinematic introduction, retain their prior timeline behavior. Resizing remeasures the content travel using the existing resize observer. Mobile bottom padding reserves clearance for navigation.

Validation: JavaScript syntax passed. Executed the actual timeline script in a simulated DOM for short and tall desktop content, tall mobile content, reduced motion, content resizing, navigation to the next section, and a section without the new attribute; all assertions passed. This checks timeline logic, not browser rendering; the visual-verification limitation above still applies.

### Follow-up: section separation and idle snapping — 2026-10-15

Research project timelines now expose two independent settings in `research/project-layout.css`: `--project-section-gap: 10` (a minimum visual separation of 10vh between moving section boxes) and `--project-section-snap-delay: 500` (milliseconds without page scrolling before settling a transition). The existing 50vh transition scroll distance and 50vh hold padding are unchanged. Short content may produce more than the minimum gap to keep inactive sections outside the viewport. Setting the gap to zero restores the previous displacement behavior.

After a 500ms pause strictly within a section transition, the timeline animates to its nearest endpoint. Before the midpoint it returns to the outgoing section's hold end, preserving the reader's place; at or after the midpoint it advances to the incoming section's hold start. Section holds, the opening reveal, content reading, and cinematic scene progress do not snap. Snapping reuses the existing navigation easing, with immediate settling in reduced-motion mode after the idle delay. Programmatic navigation cannot start another snap. New scrolling resets the countdown; wheel, keyboard, pointer, and touch input cancel pending/active snapping. Active touch or pointer contact suppresses snapping until release, with subsequent momentum restarting the countdown. Resize cancels stale timers/animations and remeasures travel.

Section movement now uses measured pixel distances when the gap is enabled, accounting for different section heights, top insets, and the methods section's content travel. This prevents content-height sections from overlapping adjacent sections. The cinematic markup, scene timing, and 900vh hold are unchanged. The design-page framework and homepage were not changed in this follow-up.

Validation: `tests/project-layout.test.cjs` runs the production timeline in a controlled DOM/clock without external dependencies. All 19 checks passed, covering the 500ms threshold, midpoint direction, repeated pauses, snap completion, input cancellation, finger contact/momentum, reading/opening/cinematic exclusions, reduced motion, navigation, short and tall desktop/mobile sections, resizing, gap geometry, content reachability, and zero-gap compatibility. Run with `node tests/project-layout.test.cjs`. These checks do not replace browser/device verification; the Computer Use permission limitation remains.

### Follow-up: text-only cards — 2026-10-15

Text-only content cards, overview summaries, and fact cards across research and design project pages now have no background fill. Dissertation narrative cards also inherit their section's text color, keeping them readable in light and dark sections. Their existing spacing and layout remain in place. Removed the unused text-card background token; image treatments and media captions retain their existing styling. Verified the CSS changes and whitespace checks; browser visual verification remains unavailable as recorded above.

## Shared content-sized project sections — 2026-10-15

All five research and four design pages now load the same `project-page.js` runtime and final `project-page.css` stylesheet. The local project stylesheets remain visual foundations, while their older JavaScript files are retained as inactive legacy references. The shared files define the active behavior described here and supersede the earlier fixed-height and opening-reveal notes above.

- Titles and overviews are separate timeline blocks with their existing `#project-opening` and `#project-overview` destinations. Each hugs its content; the previous viewport-height shrinking title reveal is removed.
- Every ordinary content block and the Related Projects block carries `data-project-content-height`. Its height, grids, text cells, figures, and captions follow their contents without an inner vertical scrollbar or heading-height cap. Desktop column spans remain; mobile content grids stack. Text-only surfaces remain transparent.
- Tall blocks move through the clipped sticky viewport using page scroll. The timeline measures title, overview, content, and related sections alike; expanding disclosures, image loading, fonts, and resizing trigger remeasurement. Changes above the reader preserve their current section and local scroll position, including transition progress.
- The minimum moving-section gap remains 10vh and the idle snap delay remains 500ms, configured centrally in `project-page.css`. Snaps apply only between sections, including title/overview transitions. Reading, the cinematic hold, and direct content scrolling are not snapped. Input cancellation, touch-contact suppression, and reduced-motion handling apply across all nine pages.
- Related Projects is now an ordinary content-height terminal section. Its wrappers, headings, years, and cards follow natural flow; the fixed 300vh hold and cinematic scene entrance are removed. The existing native horizontal carousel, arrow/Home/End keys, card selection, and indicator controls remain. Horizontal card movement no longer seeks the page timeline, and vertical page scrolling no longer drives card selection. Text-only recommendation cards are transparent and inherit the dark section's foreground color.
- Metaverse-based Workspace for Research and Synthesis Infrastructure Foundation now use the same title/overview/related structure and overlay navigation. Their existing text, metadata, publication link, project links, and routes were retained; no missing project narrative was invented.
- The immersive cinematic introduction is the sole full-screen exception. Its complete section markup, media references, scene timing, quotations, hold attributes, and renderer are identical to the pre-update snapshot. It retains its original mobile overlay composition while active. Its absolute position in the document timeline changes because title and overview are now separate blocks.

Verification: all nine pages passed HTML nesting, unique-ID, navigation registration, local resource, and fragment checks. All 67 noncinematic timeline sections carry the content-height attribute; only the cinematic introduction retains a fixed hold. The complete cinematic HTML region and its scene renderer match the snapshot taken before this update. All 23 executable timeline checks passed, including natural title/overview navigation with and without a cinematic block, tall and short sections, idle timing, midpoint snapping, input cancellation, touch momentum, reduced motion, resizing, and late image/font changes. Browser visual/device verification remains unavailable because Computer Use permissions have not been granted; these results do not claim rendered or touch-device acceptance.
