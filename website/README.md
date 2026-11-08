# Node.mgo website

A traditional multi-page website built with static HTML, CSS and vanilla JavaScript. No build step or frontend framework is required.

## Local preview

From the repository root:

    python -m http.server 8000 --directory website

Then open http://localhost:8000.

## Structure

- `index.html`: landing page
- `downloads/`: OS-specific download status and release links
- `docs/`: user and technical documentation
- `tutorials/`: practical tutorials
- `assets/`: shared styles and navigation behavior

## GitHub Pages

The `.github/workflows/pages.yml` workflow publishes the contents of this directory to GitHub Pages when changes are pushed to `bootstrap/runtime-structure`.

The download cards intentionally link to GitHub Releases instead of fabricated installer URLs. Native installers must be built, tested and attached to a real release before the website advertises direct downloads.
