# Portfolio renovation

A fresh, responsive redesign of Siyi Zhu’s portfolio.

- [Living specification](SPECIFICATIONS.md): requirements, content inventory, decisions, delivery status, and verification.
- [Legacy reference library](reference/README.md): preserved code and original-project location.
- [Asset inventory](reference/ASSETS.md): media available for selective reuse.

## Local preview

The homepage uses CSS and JavaScript for full-screen sticky blocks, a fixed navigation overlay, and scroll-driven card carousels. Principal project pages use content-driven sticky timelines, responsive grids, project-specific overlay navigation, and cinematic dark sections. Visual refinement is ongoing.

Adjust `--block-height` (200) and `--transition-height` (50) in `layout.css` to change homepage scroll timing. Current values give a 100vh hold and 50vh transition for each block. Project timing is configured separately in `research/project-layout.css` and `design/project-layout.css`.

Open `index.html` in a browser, or run from this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit <http://127.0.0.1:8000/>. No install or build is required.

The homepage links to five research pages in `research/` and four design pages in `design/`. Seven pages use the full project framework; two research pages remain lightweight documents with static Related Projects footers. See the living specification for current measurements, interaction states, and remaining work.
