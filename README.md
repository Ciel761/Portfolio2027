# Portfolio renovation

A fresh, responsive redesign of Siyi Zhu’s portfolio.

- [Living specification](SPECIFICATIONS.md): requirements, content inventory, decisions, delivery status, and verification.
- Local reference library: `reference/README.md`, with preserved code and the original-project location.
- Local asset inventory: `reference/ASSETS.md`, documenting media available for selective reuse.

The `reference/` folder stays local and is excluded from the GitHub repository. Website assets needed to run the portfolio are included under `assets/`.

## Local preview

The homepage uses CSS and JavaScript for full-screen sticky blocks, a fixed navigation overlay, and scroll-driven card carousels. Principal project pages use content-driven sticky timelines, responsive grids, project-specific overlay navigation, and cinematic dark sections. Visual refinement is ongoing.

Adjust `--block-height` (200) and `--transition-height` (50) in `layout.css` to change homepage scroll timing. Current values give a 100vh hold and 50vh transition for each block. All project pages use the shared `project-page.js` runtime and `project-page.css` content-sizing rules. Set `--project-section-gap` (10, in vh) and `--project-section-snap-delay` (500, in milliseconds) in `project-page.css` to tune their section separation and idle snapping. The local research/design stylesheets supply the existing visual styles; their older JavaScript files are retained as legacy references and are no longer loaded by project pages.

Open `index.html` in a browser, or run from this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit <http://127.0.0.1:8000/>. No install or build is required.

The homepage links to five research pages in `research/` and four design pages in `design/`. All nine use content-sized title, overview, content, and Related Projects sections with page scrolling instead of inner vertical scrollbars. The immersive case study's cinematic introduction retains its full-screen sequence. See the living specification for current measurements, interaction states, and remaining verification.

Run the dependency-free timeline regression checks with `node tests/project-layout.test.cjs` when Node.js is available. These logic checks do not replace browser or device testing.
