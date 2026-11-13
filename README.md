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

## Updating the programme

The schedule comes from pretalx: https://events.furcation.org.uk/furcation-2026/schedule/export/schedule.json

Run `python3 tools/fetch-schedule.py` to download it and rewrite `js/events.js`, then commit and publish. If the download fails, `js/events.js` is left unchanged.

- Days and tabs come from the schedule's days.
- Events are coloured by pretalx track, or by session type (Games, DJs, Charity, …) when no tracks are set. Colours for today's types are fixed in `js/app.js` (`TYPE_COLORS`); a track colour set in pretalx overrides them.
- The same event in several rooms at the same time (e.g. ceremony relays) is shown once, with both rooms.
- Anything with "setup" in its title is left out.

You can also pass a saved `schedule.json` path instead of downloading.

## Files

- `index.html`, `css/style.css`, `js/app.js`: the site
- `js/events.js`: generated from the pretalx schedule (committed so the site also works opened from disk)
- `vendor/jspdf.umd.min.js`: [jsPDF](https://github.com/parallax/jsPDF) 4.2.1 (MIT), used for PDF export
