# Portfolio renovation

A fresh, responsive redesign of Siyi Zhu’s portfolio.

- [Living specification](SPECIFICATIONS.md): requirements, content inventory, decisions, delivery status, and verification.
- [Legacy reference library](reference/README.md): preserved code and original-project location.
- [Asset inventory](reference/ASSETS.md): media available for selective reuse.

## Local preview

The homepage uses CSS and JavaScript for full-screen sticky blocks, a fixed navigation overlay, and scroll-driven card carousels. Project pages remain plain HTML. Visual refinement is ongoing.

Adjust `--block-height` (200) and `--transition-height` (20) in `layout.css` to change viewport-based scroll timing. Current values give a 100vh hold and 20vh transition for each block.

Open `index.html` in a browser, or run from this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit <http://127.0.0.1:8000/>. No install or build is required.

The homepage links to five research pages in `research/` and three design pages in `design/`. Pages contain available reference descriptions, dates, and publication links. Full case-study text and media migration remain pending.
