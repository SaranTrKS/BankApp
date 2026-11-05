# DCCB-VZM Branches — Reference Data

Branch list for DCCB-VZM (District Co-operative Central Bank, Vizianagaram), transcribed from the scanned source images in [`Documents/braches_1.png`](../Documents/braches_1.png) (rows 1-16) and [`Documents/branches_2.png`](../Documents/branches_2.png) (rows 17-25). Added 2026-11-05.

**Status (2026-11-05): in use.** The app's copy of this data is `backend/branches.py` — that file, not this table, is the source of truth; edit it there and update this table to match. It drives:
- the required **Branch** dropdown at customer signup (via `GET /branches`, which leaves out the emails), sorted nearest-first using the coordinates below;
- **branch managers**: each email below (except 201) signs in as the manager of that branch and sees only its customers;
- **super managers**: 201's email (`vzmco201`, Head Office) is one of the three super managers. See docs/auth-and-manager.md.

Email pattern: a short branch abbreviation plus the branch code, at `@dccbvzm.org`. Head office is the exception (`vzmco201`).

| Sno | Branch | Code | Email | Lat, Lng (approx.) |
|---|---|---|---|---|
| 1 | Vizianagaram (H.O) | 201 | vzmco201@dccbvzm.org | 18.1141, 83.4114 |
| 2 | Bobbili | 202 | bbl202@dccbvzm.org | 18.5748, 83.3523 |
| 3 | Cheepurupalli | 203 | cpp203@dccbvzm.org | 18.3100, 83.5665 |
| 4 | Gajapathinagaram | 204 | gpm204@dccbvzm.org | 18.2810, 83.3339 |
| 5 | Gantyada | 205 | gtd205@dccbvzm.org | 18.1420, 83.2975 |
| 6 | Garividi | 206 | gvd206@dccbvzm.org | 18.2824, 83.5336 |
| 7 | Kothavalasa | 207 | ktv207@dccbvzm.org | 17.8958, 83.1837 |
| 8 | Nellimarla | 208 | nml208@dccbvzm.org | 18.1626, 83.4473 |
| 9 | Parvathipuram | 209 | ppm209@dccbvzm.org | 18.7832, 83.4279 |
| 10 | Poosapatirega | 210 | ppr210@dccbvzm.org | 18.0915, 83.5518 |
| 11 | Srungavarapukota | 211 | skt211@dccbvzm.org | 18.1111, 83.1400 |
| 12 | Saluru | 212 | slr212@dccbvzm.org | 18.5176, 83.2050 |
| 13 | Seethanagaram | 213 | snr213@dccbvzm.org | 18.6576, 83.3761 |
| 14 | Therlam | 214 | tlm214@dccbvzm.org | 18.4867, 83.5042 |
| 15 | V.T.Agraharam | 215 | vta215@dccbvzm.org | 18.0854, 83.3870 |
| 16 | Vizianagaram | 216 | vzm216@dccbvzm.org | 18.1141, 83.4114 (same as H.O) |
| 17 | Balijipeta | 217 | blp217@dccbvzm.org | 18.6129, 83.5302 |
| 18 | Gurla | 218 | grl218@dccbvzm.org | 18.2118, 83.4658 |
| 19 | Ramabhadrapuram | 219 | rbp219@dccbvzm.org | 18.4971, 83.2794 |
| 20 | Kurupam | 220 | kpm220@dccbvzm.org | 18.8661, 83.5542 |
| 21 | Merakamudidam | 221 | mmm221@dccbvzm.org | 18.4114, 83.4621 |
| 22 | Mentada | 222 | mtd222@dccbvzm.org | 18.3097, 83.2617 |
| 23 | Vepada | 223 | vpd223@dccbvzm.org | 18.0117, 83.0811 |
| 24 | Dattirajeru | 224 | dtt224@dccbvzm.org | 18.3919, 83.3779 (mandal centre) |
| 25 | Bhogapuram | 225 | bgpm225@dccbvzm.org | 18.0321, 83.4978 |

## About the coordinates

Looked up on 2026-11-05 from OpenStreetMap (Nominatim) by town/locality name, so each is the **town centre, not the branch building** — every branch has `approx=True` in `branches.py`. Fine for "nearest first" sorting; distances are shown as "~" values.

- Name clashes fixed by hand: Cheepurupalli and Gajapathinagaram first matched same-named villages in other districts, and Seethanagaram's first match was in East Godavari. All 25 now sit inside Vizianagaram / Parvathipuram Manyam districts (lat 17.9–18.9, lng 83.1–83.6).
- V.T.Agraharam is a locality inside Vizianagaram town (Vontitadi Agraharam).
- 216 shares the H.O's coordinates; 224 is the Dattirajeru mandal centre (OSM has no point for the village itself).
- **To make a branch exact:** open the branch in Google Maps, right-click its pin, copy the two numbers into that branch's `lat`/`lng` in `backend/branches.py`, set `approx=False`, and update this table.

Distance in the signup dropdown is straight-line (haversine), computed in the browser from the visitor's location, which is never sent to the server. The "📍 Map" link is a plain Google Maps URL (no API key).
