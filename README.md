# Furcation 2026 Planner

A small static website for planning your Furcation 2026 (Thursday 19 – Monday 23 November).

1. Enter your name.
2. Tick the events you want on each day's tab. Overlapping picks are flagged as clashes.
3. Download your plan as:
   - **Calendar (.ics)**: works with Apple Calendar, Google Calendar and Outlook. Each entry has the stage as its location.
   - **PDF** or **PNG** poster of your weekend.

Your name and picks are remembered in your browser.

## Running it

No build step is needed. Open `index.html` in a browser, or host the folder anywhere static.

Hosted on Netlify (see `netlify.toml`): connect the repo in Netlify and it redeploys on every push to `main`. No build command is needed; the publish directory is the repo root.

## Updating the programme

Edit `data/events.csv` (`type` is one of Furcation, Charity, Community, DJ, Registration — it sets the colour), then regenerate the embedded data:

```sh
python3 tools/csv-to-js.py
```

## Files

- `index.html`, `css/style.css`, `js/app.js`: the site
- `js/events.js`: generated from `data/events.csv`
- `vendor/jspdf.umd.min.js`: [jsPDF](https://github.com/parallax/jsPDF) 4.2.1 (MIT), used for PDF export
