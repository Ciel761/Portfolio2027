# Portfolio renovation specification

Last updated: 2026-09-11.
Status: Project initialized; design and implementation pending.

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
- Let content determine section height; keep all content reachable on short screens.
- Make images and videos fit their containers and preserve intended aspect ratios.
- Provide navigation and project access for touch, mouse, and keyboard.
- Preserve usability at 200% text zoom, visible keyboard focus, semantic headings, meaningful image alternatives, and reduced-motion preferences.
- Avoid loading all demonstration videos eagerly; define media loading and fallback behavior during implementation.

## Design specification to develop

Record the audience and primary visitor task, information architecture, page content, typography, colors, spacing, grid, component states, navigation behavior, responsive changes, media treatments, and motion here as decisions are made.

Visual direction, framework, final routes, and hosting are currently undecided. The original blue palette, typography, and scroll effects are reference material only.

## Delivery sequence

1. Establish the reference library and content inventory — complete.
2. Develop the new design direction and page structure — pending.
3. Specify reusable components and responsive behavior — pending.
4. Implement the new site and migrate selected content/assets — pending.
5. Verify layouts, navigation, links, accessibility, and media behavior — pending.
6. Record final implementation and publishing details — pending.

## Decision log

| Date | Decision | Basis |
| --- | --- | --- |
| 2026-09-11 | Develop in the renovation workspace and preserve the original project. | User supplied a separate reference project. |
| 2026-09-11 | Design from scratch; reuse legacy material selectively. | Explicit user requirement. |
| 2026-09-11 | Maintain this specification as the project develops. | Explicit user requirement. |

## Verification log

- 2026-09-11: Inspected original source structure and homepage content.
- 2026-09-11: Copied original HTML/CSS/JS and verified copies using SHA-256.
- No new site implementation or browser validation has been completed.

## Version control

The renovation workspace uses a local Git repository with `main` as the initial branch. The initial baseline includes documentation, the legacy code reference, the asset inventory, and the empty homepage placeholder. No remote has been configured.

## Documentation maintenance

Update this file whenever requirements, design, implementation, or validation change. Distinguish confirmed requirements from proposals, record unresolved choices, and document known issues. Add detailed Markdown documents when needed and link them from this specification.
