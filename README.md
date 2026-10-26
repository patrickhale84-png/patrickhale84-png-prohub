# proHUB

One landing page (`index.html`) with 19 tiles. Each tile opens its own screen inside the page.

```
index.html                  proHUB landing page: tile grid
filmhub.html                front desk (reads what the hubs save in the browser)
tiles/
  pre-production.html       Screenwriter, Evaluator, Film DB, Outreach, Festivals & Labs, Budget
  production.html           Scriptation, Storyboard Studio, Shot List, Stripboard, Master Script, Call Sheet, Gear, Dailies
  post-production.html      Pitch Deck, FilmCraft, Photopea, Graphite
```

Keep all files on the same site or folder. They share browser storage, so they must be on the same origin.

Every screen links back to proHUB only.

## Tile map

| # | Tile | File | Entry |
|---|------|------|-------|
| 1 | Screenwriter | `tiles/pre-production.html` | `writer` |
| 2 | Evaluator Studio | `tiles/pre-production.html` | `coverage` |
| 3 | Pitch Deck Maker | `tiles/post-production.html` | `pitchmaker` |
| 4 | Film Database | `tiles/pre-production.html` | `filmdb` |
| 5 | Outreach | `tiles/pre-production.html` | `outreach` |
| 6 | Advanced Budget | `tiles/pre-production.html` | `budget` |
| 7 | Stripboard | `tiles/production.html` | `oneliner` |
| 8 | Call Sheet | `tiles/production.html` | `callsheet` |
| 9 | Crew & Cast (DOOD) | `tiles/production.html` | `callsheet` |
| 10 | Shooting Script | `tiles/production.html` | `masterscript` |
| 11 | Props Tracker | `tiles/production.html` | `scriptation` |
| 12 | Gear Checklist | `tiles/production.html` | `gearlist` |
| 13 | Master Shot List | `tiles/production.html` | `shotlist` |
| 14 | Script Library | `tiles/pre-production.html` | `scriptlib` |
| 15 | Storyboard Studio | `tiles/production.html` | `storyboard` |
| 16 | FilmCraft | `tiles/post-production.html` | `filmcraft` |
| 17 | Photopea | `tiles/post-production.html` | `photopea` |
| 18 | Graphite | `tiles/post-production.html` | `graphite` |
| 19 | Festivals & Labs | `tiles/pre-production.html` | `festivals` |

Tiles whose desk lives in another file open that file: Advanced Budget opens the preHUB budget, Crew & Cast opens the Call Sheet, and Props Tracker opens Scriptation.

## How a tile opens a desk

`index.html` loads the screen in a frame and asks for a desk three ways: the `#entry` in the address, a `hashchange`, and a `postMessage` (`{k:'sw',a:'<desk>'}` or `{type:'HUB_ENTER',a:'<desk>'}`). `pre-production.html` and `production.html` both listen for these, so it also works when opened from a local file.

## Shared storage keys

| Key | Written by | Read by |
|-----|-----------|---------|
| `prehub_v3` | preHUB, index | production, filmHUB |
| `prehub_master_v1` | preHUB Transmit, index import | production, filmHUB |
| `prohub_scriptation_v1`, `prohub_meta_v1` | production Scriptation | filmHUB |
| `prohub_callsheet_v1` | production Call Sheet | filmHUB |
| `prohub_shots_v1` | production Shot List | filmHUB |
| `prehub_shotlist` | preHUB Shot List | filmHUB |
| `ob_letters`, `ob_custom`, `fest_marks` | preHUB Outreach and Festivals | filmHUB |
| `prohub_gear_v1` | production Gear Checklist | production |


## Screenwriter formats

- **Import:** PDF (rebuilt from page layout), `.fdx`, Fountain / plain text (indented or not), WriterDuet-style `.json`, and multi-line paste straight into the editor.
- **Cleanup on import:** hard-wrapped lines are rejoined, scene numbers, page numbers, `(MORE)` / `(CONTINUED)` and `(CONT'D)` are removed, the title page is read separately, and a speech split across pages is stitched back together.
- **Export:** Fountain, formatted plain text, FDX and JSON, all of which re-import identically.
- **Layout:** Courier 12 pt on a 12 pt line grid, 1.5 in / 1 in margins, standard indents, page numbers from page 2, headings and cues kept with the line that follows, automatic `(CONT'D)`, and printing that matches the screen page for page.

## Budget (preHUB, "5. Pre-Lim Budget")
Fully editable line-item budget: Top Sheet / Detail / Variables & Fringes tabs; Micro, Low, Mid and Tier-1 templates; per-line qty × multiplier × rate; fringe table (SAG-AFTRA, DGA, WGA, IATSE, Teamsters + payroll tax and workers' comp); union on/off switches; overtime (1.5×/2× thresholds); % lines (insurance, bond, overhead, contingency); Estimate vs Cost Report; undo/redo, saved versions, CSV/JSON export, JSON import, print. Stored in `prohub_budget_v1`. Guild rates are planning defaults — confirm against current rate sheets.

## Save / load / client site
- **Save all / Load all** (index header and filmHUB): one JSON file containing every saved item in this browser (script, schedule, shots, budget, deck, notes…). Loading overwrites matching items.
- **filmHUB → Client site**: downloads a self-contained HTML presentation (overview, pitch deck, scenes, cast, schedule, shots, budget). **Site + backup** also embeds the full backup, so filmHUB → Import restores everything from that same HTML file.
- **Close** button: on every tile (dashboard bar, Esc, and a Close pill when a tool is opened by itself) returns to the home screen without deleting anything.
- **Pitch deck**: 8 style templates, font-size slider (this slide or all), tracking, weight, caps, and background/text/accent colours.


## Print / Export (new)

`filmhub.html` has a **Print / Export** tile (also `filmhub.html#print`, linked from every page's menu).
It builds PDFs on the device with `lib/pdf-lib.min.js` (keep this file next to `filmhub.html`; no internet needed).

- Documents: Cover, Call Sheet, Sides, Cast & Crew In Times, Shooting Script, Stripboard, Shooting Schedule, Day Out of Days, Cast List, Crew List, Script Breakdown, Shot List, Storyboards, Location Report, Vendor List, Budget Top Sheet.
- Presets: AD, Director, Producer/UPM, Production office, Department heads, Camera/DP, Talent packet, Full package, plus your own saved presets.
- Options per document, plus paper (Letter/A4/Legal), margins, text size, 12/24-hour times, color or B&W, footer, watermark, logo, cover page, combined or separate files.
- **Production Setup** tile: company, people, crew by department, cast contacts, shoot start date.
- **Call Sheet** tile: day setup, set address lookup (OpenStreetMap), weather (Open-Meteo) and nearest hospital that update by themselves, vendor search near the set with a verify checkbox that prints on the call sheet.
- All of it is stored in the browser under `filmhub_prod_v1` (included in the JSON backup).
- Online lookups need a connection; everything else works offline.

### Shooting script standards
Screenwriter shooting mode and the Shooting Script PDF follow production convention: scene numbers on headings only, in both margins; locked scripts insert 12A / A1; cut scenes stay as `N OMITTED`; revised lines get an asterisk in the right margin; `(CONTINUED)` at the foot and `CONTINUED:` with the scene number at the top of a continued scene; revision color and date on every page header; "Shooting Draft" and revision on the title page. Press Transmit in Screenwriter to carry numbers, omits, revision flags and color to filmHUB.

## Cloud save (Wix members only)

Cloud save needs a logged-in Wix member. filmHUB runs inside a page on the Wix site; that page's code (`velo/page-code.js`) passes requests to a backend web module (`velo/backend/proHubCloud.web.js`) that identifies the member on the server and reads and writes two collections:

- `ProHubProjects`: `pid`, `name`, `owner`, `editors` (text), `created` (number)
- `ProHubSaves`: `pid`, `k`, `i`, `n`, `ts`, `v`, `by` (text, number as listed)

Both collections should be Admin-only; the CSV files in `velo/` create them. Projects belong to the member who created them and can be shared with other members by email. Outside the Wix page, or when logged out, cloud save stays off.

## Co-writing

The Co-write tile opens `cowrite.html`. Writers share one script through the member-login cloud project. Each line has its own id, so edits to different lines merge automatically; if two people change the same line, the other version stays and yours is added as a note on that line. Add the two new web-module methods (`loadKey`, `presence`) by re-pasting `velo/backend/proHubCloud.web.js` and `velo/page-code.js` into Wix.
