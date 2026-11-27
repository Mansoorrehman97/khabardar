# Khabardar

**Flood warning on every phone, in Urdu or English, before the water comes.**
*Har phone, waqt se pehle.*

## Project links

- **Live app (control room):** [khabardar-pearl.vercel.app/dashboard.html](https://khabardar-pearl.vercel.app/dashboard.html)
- **Start page:** [khabardar-pearl.vercel.app](https://khabardar-pearl.vercel.app)
- **Demo video (1 min 37 s):** [khabardar-pearl.vercel.app/video.html](https://khabardar-pearl.vercel.app/video.html)
- **Pitch deck (PDF):** [khabardar-pearl.vercel.app/docs/Khabardar-Pitch-Deck.pdf](https://khabardar-pearl.vercel.app/docs/Khabardar-Pitch-Deck.pdf)
- **Mirror (same app, if one host is slow):** [mansoorrn-khabardar.static.hf.space](https://mansoorrn-khabardar.static.hf.space)
- **Phones:** scan the QR code shown in the control room (it opens `phone.html?room=…`)
- **Hugging Face Space:** [huggingface.co/spaces/Mansoorrn/khabardar](https://huggingface.co/spaces/Mansoorrn/khabardar)
- **Source code:** [github.com/Mansoorrehman97/khabardar](https://github.com/Mansoorrehman97/khabardar)

Capital Youth Expo 2026 · Hackathon 04-HK · Track 4: Smart Agriculture & Climate

## Why it matters

In August 2025, cloudbursts and flash floods hit Buner, Swat and Shangla, many of them at night. A survey of
1,207 households found that **85 out of 100 families got no warning**. In 2022, floods affected **33 million
people** and caused about **$30 billion** in damage and losses.

Pakistan does send flood warnings, but they usually arrive as written SMS on one network, for a whole district,
and nobody knows who actually received them. Khabardar watches **58 flood-prone places across Pakistan** with live
rain and river forecasts and **NASA satellite data**, rings every phone in the danger area with a **siren and a
spoken warning in Urdu or English** (keypad phones get an SMS), tells people **where to go**, and lets them answer
**"I'm safe"** or **"I need help"**. The control room sees who was warned, who heard the siren and who needs
rescue, sends the **nearest rescue team**, and the person's phone is told that **help is on the way**.

It works **automatically**: when a place reaches Warning, the control room counts down 10 seconds (so an officer
can cancel) and sends the alert by itself, and it sends the best available rescue team to each person who asks for
help. Every step can also be done **manually**.

This is a hackathon demo. The risk score is a simple, transparent rule, tuned on one monsoon (2025), not an official
forecast. In real use, the automatic rules would be agreed with the disaster management authority (PDMA / NDMA / Rescue 1122).

## What it does

| Step | What happens | Example |
|---|---|---|
| **1. WATCH** | For 58 places and six kinds of flood (river, flash flood, city flooding, glacial lake outburst, hill torrent, coastal storm): rain, temperature and wind forecasts, river discharge 7 days ahead, and NASA satellite data (flood water, **radar water through clouds**, rain from space, soil wetness, population) become a 0–100 risk score, a flood map, **where the flood goes next with arrival times**, and **how many people are affected** | "Flood water from Mingora expected at Charsadda in about 8 hours." |
| **2. WARN** | **Automatically** when a place reaches Warning (after a 10-second countdown an officer can cancel), or with one button. Every phone that chose that place rings with a siren, vibration and a voice and written warning in Urdu or English, the reason ("heavy rain expected", "river rising", "NASA satellites see flood water"), the nearest safe point and a route. Keypad phones get an SMS | "Khabardar! Sailab aa raha hai. Foran oonchi jagah jaayein." |
| **3. HELP** | People tap "I'm safe" or "I need help" and can add how many people are with them and who is injured, elderly, a child or pregnant. People **without the app** send an SMS ("MADAD Dadu 5 zakhmi"), or a neighbour with the app **reports** them. Phones that **do not answer** in a danger area are flagged for a check. The control room ranks everyone by urgency and **automatically** sends the best available team (or the officer does), and the phone shows "Rescue 1122 is on the way, about 10 minutes". With no signal, the phone **saves** the request and sends it when the signal returns | Rescue teams see exactly who needs help first, and where |

## Try it in one minute (no phone needed)

1. Open the **[control room](https://khabardar-pearl.vercel.app/dashboard.html)** on a laptop. About 85 **dummy phones** across Pakistan are already loaded (labelled DUMMY), and **Automatic mode** is ON.
2. In **Map layers → NASA date**, choose **NASA replay: 30 Aug 2022**. NASA's satellite flood map of the 2022 floods appears in blue, and Sukkur, Dadu, Larkana, Mehar, Jacobabad and others turn red.
3. **Do nothing.** After a 10-second countdown, Khabardar sends EVACUATE to 10 places and WARNING to 4 more by itself. Open the **Phone wall** tab: each dummy phone rings with the warning in its language; click one to see its screen.
4. Open the **Rescue queue**: people asking for help are ranked by urgency, and the best available team is sent automatically after 5 seconds (press **Hold** to decide yourself). Press **Mark rescued** when done.
5. Manual control: untick automatic alerts, select places on the map, choose a level and press **SEND ALERT**; or press **Send team now** on a request.
6. With a real phone: scan the QR code, choose a place, tap **Turn ON Khabardar**, click that place on the map → **Simulate heavy rain (TEST)**, and the alert arrives automatically. Tap **I need help** on the phone.

## Built on open data

| Data | Source | Use |
|---|---|---|
| Hourly rain forecast | [Open-Meteo](https://open-meteo.com) Forecast API (CC BY 4.0) | Rain score for each place |
| River discharge: past 30 days and next 7 days | GloFAS v4, Copernicus Emergency Management Service, via the Open-Meteo Flood API | River score (3-day peak compared with normal) |
| **Flood water seen by satellite** (3-day) | **NASA** LANCE flood products from **MODIS** (Terra + Aqua) and **VIIRS** (NOAA-20 + NOAA-21), via NASA GIBS | Satellite flood score and the blue flood map; replay of past floods |
| **Rain from space** (latest half-hour) | **NASA GPM IMERG** precipitation rate, via NASA GIBS | Observed rain added to the rain score; map layer |
| **Soil wetness** | **NASA SMAP** Level-4 root-zone soil moisture, via NASA GIBS | Wet ground raises the rain score by up to 50% |
| **Radar water (sees through clouds and at night)** | **NASA JPL OPERA** DSWx-S1 surface water from **Sentinel-1 radar**, via NASA GIBS | New water (last 3 days compared with 6 weeks earlier); map layer |
| Radar image | NASA JPL OPERA RTC-S1 (Sentinel-1 radar backscatter), via NASA GIBS | Map layer |
| **Where people live** | **NASA SEDAC** Gridded Population of the World v4, 2020, via NASA GIBS | People within 6 km, in danger zones and under flood water |
| Snow cover | NASA VIIRS (NOAA-20) snow cover, via NASA GIBS | Map layer (glacier and snow-melt areas) |
| Landslide hazard | NASA SEDAC Global Landslide Hazard, via NASA GIBS | Map layer |
| Temperature and wind gusts | Open-Meteo Forecast API | Glacier melt in heatwaves (Gilgit-Baltistan, Chitral); coastal storms (Karachi, Thatta, Badin) |
| Rain in the hills upstream | Open-Meteo Forecast API at points in the Koh-e-Suleman, Kirthar, Bolan and other hills | Hill torrents (D.G. Khan, Rajanpur, Taunsa, D.I. Khan, Jhal Magsi, Sibi, Jacobabad…) |
| River paths | `web/js/villages.js`: 49 links between places with rough flood-wave travel times | Where the flood goes next, and when |
| Flood history | NASA SEDAC Global Flood Hazard 1985–2003, via NASA GIBS | Map layer |
| Satellite photo | NASA VIIRS (NOAA-20) true colour, via NASA GIBS | Map background option |
| Recent disasters | **NASA EONET** (Earth Observatory Natural Event Tracker) | Floods, storms and landslides of the last 12 months on the map |
| Map | Leaflet 1.9.4 and © OpenStreetMap contributors | Control room map |
| Walking route | Google Maps directions link (no API key) | Route to the safe point; directions for rescue teams |
| Places | `web/js/villages.js`: 58 places in KP, Gilgit-Baltistan, AJK, Punjab, Sindh and Balochistan | Who gets warned |
| Safe points and Rescue 1122 stations | **OpenStreetMap** (Overpass API, ODbL) + **Open-Meteo Elevation API** (Copernicus DEM) → `web/js/safepoints.js` | Highest named school / college / hospital within 4 km; real stations where mapped (to be confirmed by PDMA) |
| Past forecasts | **Open-Meteo Previous Runs API** (forecast issued ~1 day earlier) → `web/data/replay-2025-08-punjab.json` | Before-the-flood replay and the false-alarm check |

The NASA numbers are read from NASA's map tiles: the app turns each pixel's colour back into a value with NASA's
published colour keys (`web/js/nasa-colormaps.js`). No NASA account or key is needed.

## How it works

**Risk score.** Every place has one or more flood types, and each type has its own score (easy to explain):

| Score | Rule | Flood types |
|---|---|---|
| Rain | (heaviest hour × 3 + next-24-hour rain × 0.65) × wet-ground factor × terrain factor — calibrated on the 2025 monsoon, so Evacuate needs about 123 mm in a day (less with a heavy hourly burst). Heaviest hour = forecast or NASA IMERG observed, whichever is larger; wet ground (NASA SMAP 0.20 → 0.45 m³/m³) × 1.0 → 1.5; steep valleys × 1.25, cities × 1.3 | all; flash floods; city flooding |
| River | (peak ÷ 30-day median − 1) × 60 for the next 3 days, or × 0.7 for the 7-day peak (further ahead, less certain) | river floods |
| Hill torrent | the rain score (same rule) of a point in the hills upstream × 0.9 | hill torrents |
| Glacier melt | (hottest day in 3 days − the town's danger temperature + 2) × 12, at most Warning | glacial lake outburst |
| Coastal storm | (strongest wind gust − 42 km/h) × 1.25 | coastal storm and surge |
| Satellite | share of land within 6 km under flood water: 1–5% Watch, 5% Warning, about 13% Evacuate. MODIS and VIIRS must agree when both see the ground. NASA radar new water alone can only raise Watch | any |
| Flood from upstream | a place in Warning or Evacuate passes 80% of its score to the next place downstream (at most Warning), 65% two steps down, 50% further (at most Watch, within 48 hours) | river floods |

Risk = the highest score, capped at 100 → **Normal < 30 ≤ Watch < 55 ≤ Warning < 80 ≤ Evacuate**. The phone shows the
reason in Urdu or English, for example "Flood water from Mingora expected here in about 8 hours".

**Where the flood goes next.** 49 river links (Swat → Kabul River → Indus → Sukkur → Hyderabad → Thatta; Chenab,
Jhelum, Ravi, Sutlej; hill-torrent and plains routes in Balochistan and upper Sindh) carry each danger downstream with a
rough arrival time. The map shows moving lines and "≈ 8 h" labels, and automatic mode warns the places downstream.

**People affected.** NASA SEDAC population density (2020) within 6 km of each place gives the people living there,
the people inside the danger zone (3, 6 or 10 km for Watch, Warning, Evacuate) and the people under the flood water
NASA sees. NASA's population map stops at 1,000 people per km², so city figures are "at least".

**Automatic mode** (in the control room, ON by default, settings saved per room):

- **Alerts:** whenever risk is updated (every 15 minutes for weather, every hour for NASA, at once for TEST scenarios
  and NASA replays, and every 30 seconds), every place at or above the chosen level (Watch, Warning or Evacuate;
  default Warning) that has not been alerted at that level in the last 6 hours gets an automatic alert. Places at
  the same level go in one alert, highest level first. A countdown (0, 10, 30 or 60 seconds; default 10) shows the
  places and the reason with **Send now** and **Cancel**. A cancelled place is left alone for an hour unless its
  risk gets worse. A place that gets worse (for example Warning → Evacuate) is alerted again at once.
- **Rescue:** each new help request gets the best available team after 5 seconds unless the officer presses
  **Hold**. "Best available" = travel time (straight line at 25 km/h + 5 minutes) plus 25 minutes for every job the
  team already has; boat teams are preferred when water is rising.
- After a reload the control room first reads the room's history, so nothing is sent twice. With two control rooms
  in automatic mode, a small random extra wait lets the second one see the first one's alert and skip it.
- Automatic mode runs in the control room page, so keep that page open (as an operations-room screen would be).
  A real deployment would run the same rules on a server.

**Protection against fake alerts.** Every alert, reset, rescue update and all-clear is **digitally signed** (ECDSA P-256)
by the control room. The private key is made in the control room's browser and never leaves it; the public key travels
in the QR code, so each phone checks every control message and ignores anything not signed by its control room. Signed
messages carry their time, so an old message cannot be replayed later. In the laptop edition (plain http on the local
Wi-Fi, where phones cannot check signatures) the laptop itself refuses alerts that do not come from the control room on
the laptop. The **Fake-alert test** button shows it: the forged alert is blocked and no phone reacts.

**All clear.** When a place that was alerted is back to Normal for a minute, automatic mode sends **ALL CLEAR**
(or the officer presses **Send ALL CLEAR**). Phones that were warned show a green "the danger has passed" screen with a
gentle chime, in Urdu or English.

**Proof: would it have warned in time?** The **before-the-flood replay** plays the **24–27 Aug 2025 Punjab floods** hour by
hour using only the forecast that was issued about one day earlier (Open-Meteo Previous Runs API), so nothing from the
future leaks in. Automatic mode reacts as it would have then:

| Place | Khabardar would have warned | Evacuate order | Heaviest rain |
|---|---|---|---|
| Narowal | 25 Aug 08:00 | 25 Aug 09:00 — **26 hours before** | 26 Aug 11:00 |
| Marala (Chenab) | 25 Aug 14:00 | 25 Aug 23:00 — **19 hours before** | 26 Aug 18:00 |
| Sialkot | 25 Aug 12:00 | 25 Aug 19:00 — **13 hours before** | 26 Aug 08:00 |

**Honest limits of the proof.** (1) **Forecasts missed the Buner cloudburst of 15 Aug 2025**: the day-ahead forecast for
Pir Baba and Daggar stayed Normal, because weather models work on 10–25 km squares and a cloudburst is a few km wide. This
is why Khabardar also uses satellite rain, river levels, flood water upstream, people's own reports and the SMS help line —
and why local rain gauges and PMD weather radar are next on the roadmap. (2) **False alarms**: with the calibrated rule,
in all of July–August 2025 the day-ahead forecast reached Evacuate on 2 days at Sialkot, Narowal and Marala (all of them
25–26 August, the real flood), 4 at Lahore and 3 at Kasur. The first rule reached Evacuate on 13 days at Sialkot, so it was
changed. Real thresholds must still be set with PMD and PDMA over several seasons.

**Real safe points.** For each place Khabardar suggests the **highest named school,
college or hospital within 4 km** of the town centre, from OpenStreetMap and elevation data (Copernicus DEM), and shows on
the phone how many metres higher it is. Today **36 of the 58 places** have such a real building; the other 22 keep a labelled
placeholder because OpenStreetMap has no suitable named building there, or every candidate is lower than the town. Real
**Rescue 1122 station locations are used for 11 districts**. These are suggestions: the PDMA and district administration
must confirm the real flood shelters.

**Help for people without the app.**
- **SMS help line:** any phone, even a keypad phone with no internet, sends for example `MADAD Dadu 5 zakhmi` (help ·
  place · people · injured; also `pani` water rising, `buzurg` elderly, `bachay` children, `hamla` pregnant, Urdu script
  works too; `1` = safe). An Android SMS-gateway phone forwards it to the laptop (`POST /sms/incoming`), and it appears in
  the rescue queue and gets a team automatically. In the online edition, the control room has a box to simulate it.
- **Report someone else:** a neighbour with the app reports people who need help (place or GPS, how many, injured…,
  landmark). The reporter is told when a team is on the way.
- **No answer = check on them:** a phone that was warned (Warning or Evacuate) but has not answered within 2 minutes
  (a demo value; real use would wait 15–30 minutes) is added to the rescue queue as "no answer — check on them".

**When there is no internet or no signal.**
- An alert is a message over a network, so **no phone can receive a new alert with no connection at all**. Khabardar
  therefore warns **early** (hours to days ahead, while networks still work) and uses every connection that still works:
  - **internet** (online edition);
  - **local Wi-Fi with no internet and no SIM signal** (laptop edition: a laptop and a Wi-Fi router at a union council
    office or relief camp are the whole network; the control room now opens without internet because the map library
    is bundled, only the map background and live data need internet);
  - **SMS**, which needs only a little mobile signal (keypad alerts by SMS gateway; help by SMS).
- After an alert has arrived, the phone keeps the alert, safe point and distance on screen without a connection.
- "I'm safe", "I need help", help details and reports are **saved on the phone** when there is no connection and **sent
  automatically** when the signal returns.
- Once opened over https (online edition) or on the laptop, the app is kept on the phone, so it still **opens** offline.

**Who gets the alert.** Each phone picks its home place and, optionally, a family member's place. An alert for a
place reaches every phone that chose it, so a son in Karachi is told when Dadu is warned. Phones elsewhere are
not disturbed. The officer can also draw a zone on the map.

**Messages.** Control room → phones: the alert. Phones → control room: "received", "siren played", then "I'm
safe" or "I need help" with GPS if shared, then optional help details. Control room → phone: "team on the way"
and "rescued". The phone writes the warning text itself in its language, so only a short message travels.

**One app, two ways to run it.** Both use exactly the same pages in `web/`; only the message relay differs.

| Edition | How | Messages travel through | Best for |
|---|---|---|---|
| **Local network** | `python server.py` | The laptop itself (built-in relay), no internet relay | **The live pitch**, on your own hotspot |
| **Online** | `web/` on any static host (Vercel, Hugging Face) | The free public **ntfy.sh** relay, on a random room code | **The live link** |

Live data (Open-Meteo, NASA) is fetched by each browser in both editions, so the hotspot needs internet.

## The app

**Control room (laptop / projector)**
- Map of 58 places coloured by risk, danger zones around places at risk, NASA layers (flood water, rain from space,
  soil wetness, flood history, satellite photo, NASA EONET events) and a **NASA date** picker with replays of
  the **30 Aug 2022** Sindh and Balochistan floods and **5 Sep 2025** Punjab floods
- **Automatic mode**: automatic alerts (level and countdown can be changed) with **Send now** / **Cancel**, and
  automatic rescue dispatch with **Hold**; both can be switched off
- **Where the flood goes next**: moving lines along river paths and "≈ N h" arrival labels; **people affected** line
  (people in danger zones and under flood water, from NASA population data)
- **NASA radar** layers (Sentinel-1 water through clouds, radar image), **snow cover**, **where people live**, **landslide hazard**
- **SMS help line** box and **reports** from neighbours in the rescue queue; **no-answer checks**
- **Manual alert**: places or a drawn zone, **Select places at Warning+** in one click, level, English and Urdu
  preview, SMS preview, and how many phones it will reach
- **Who got the warning**: phones, warned, received, safe, need help, no answer yet, counted live
- **Rescue queue**: requests ranked HIGH / MEDIUM / LOW by injuries, rising water, elderly, pregnant, children,
  group size and waiting time; **Send nearest team** (boat teams preferred when water is rising) with an estimated
  arrival time, **Mark rescued**, **Show on map**, **Directions for team**, **Assign nearest teams to all** and
  **Download rescue list (CSV)**
- **Phone wall**: every phone in the alert as a mini phone that rings in its language; click one to see its screen
- **Flood risk by place** table, sortable by region, with rain, river and NASA columns
- **Dummy phones** (about 85, labelled DUMMY), **+25 crowd** (labelled SIM), **Fake-alert test**, **Reset demo**

**Phone / PC receiver (any browser)**
- Setup in Urdu or English: place (grouped by province), family place, name, optional GPS
- Shows the current risk for your place and what NASA satellites see near you
- Full-screen alert: loud siren, vibration, spoken and written warning, nearest safe point, distance and a
  **Show route** button
- **I'm safe** / **I need help**; for help, a fresh GPS fix and a short form (number of people, injured, elderly or
  disabled, children, pregnant woman, water rising)
- "Rescue team … is on the way — about N minutes" and "You are marked as rescued" messages from the control room
- **Report people who need help** (neighbours, people without the app)
- **Outbox**: with no connection, answers and reports are saved and sent automatically when the signal returns

## What is real and what is simulated

| Part | Status |
|---|---|
| Rain forecast and river discharge for each place | **Real, live**: Open-Meteo, GloFAS |
| NASA flood water, rain from space, soil wetness, events | **Real**: NASA GIBS and EONET (latest available; satellite data is a few hours to a few days old) |
| NASA replays (2022, 2025) | **Real past satellite data**, labelled REPLAY |
| Alerts to real phones, siren, voice, receipts, safe / help, help details, "team on the way" | **Real**: works live on any phone browser |
| Dummy phones and their answers | **Simulated**, labelled DUMMY (random answers) |
| +25 crowd | **Simulated**, labelled SIM |
| Heavy-rain scenario | **TEST**: simulated values, labelled on screen |
| SMS to keypad phones | **Simulated** (logged by the server) unless an SMS gateway is set up |
| SMS help line (incoming) | **Real** in the laptop edition with an SMS-gateway phone (`POST /sms/incoming`); **simulated** with the box in the control room |
| Reports from neighbours, no-answer checks, outbox | **Real** |
| Flood-wave arrival times | **Rough estimates** (fixed travel times between places), not a hydraulic model |
| People affected | **Estimates** from NASA SEDAC population 2020 (capped at 1,000 per km², so cities are "at least") |
| Automatic voice call to keypad phones | **Not built yet**: on the roadmap |
| Safe points | **Suggested** from OpenStreetMap + elevation (real buildings); must be confirmed by the PDMA |
| Rescue teams | Real Rescue 1122 locations where OpenStreetMap has them, otherwise demo locations |
| Before-the-flood replay | **Real past forecasts** (issued a day earlier), labelled REPLAY |
| Arrival times | **Estimates** (straight-line distance at 25 km/h + 5 minutes) |

## What we tested, including what is weak

| Check | Result |
|---|---|
| Local relay: publish, live stream, history replay after reload, separate rooms, size limit, SMS log | 10 of 10 automatic checks pass |
| Real phone (browser) on the local edition: join, Evacuate alert, "I need help" with details | Alert arrived in Urdu with siren, safe point and distance; help appeared as HIGH priority |
| Send nearest team → phone; Mark rescued → phone | Phone showed "Rescue 1122 Swat is on the way — about 10 minutes", then "rescued" |
| Control room reload in the middle of a rescue | Alerts, help details and team status rebuilt from the relay history |
| Online edition (ntfy.sh): phone join and alert | Phone received the alert; control room counted "siren played" |
| NASA replay 30 Aug 2022 | Sukkur, Dadu, Larkana, Mehar, Dera Allahyar, Dera Murad Jamali, Nowshera reach Evacuate; Jacobabad, Sanghar, Khairpur, Rajanpur, D.I. Khan reach Warning or above |
| Automatic mode, TEST heavy rain at Mingora, no clicks | Countdown started at once; EVACUATE sent to 7 phones after 10 s; the real phone showed "Automatic warning — why: heavy rain 165 mm in 24 hours" in Urdu |
| Automatic rescue | The phone's help request got Rescue 1122 Swat after 5 s and the phone showed "on the way, about 10 minutes" |
| Automatic mode with the 2022 replay | EVACUATE to 10 places, then WARNING to 4 more, by itself; every dummy help request got its nearest team |
| Cancel during the countdown (Bahrain) | No alert sent; Bahrain left alone for an hour |
| Reset demo | Clears alerts and rescue list and ends a NASA replay |
| Flood path: TEST heavy rain at Mingora | Charsadda ≈ 8 h (Warning), Nowshera ≈ 12 h (Warning), Attock ≈ 18 h and Mianwali ≈ 32 h (Watch); automatic EVACUATE to Mingora, then automatic WARNING to Charsadda and Nowshera with the reason "flood water from Mingora…" |
| NASA replay 2022 with flood paths | Flood moving to Hyderabad (≈ 48 h) and Thatta (≈ 62 h); about 2.3 million people in danger zones, about 202,000 under the flood water NASA saw near the 58 places |
| NASA radar (live) | 58 places checked; new water near Marala and Jhelum raised them to Watch only (radar alone cannot go higher) |
| SMS help line | "MADAD Mehar 6 pani buzurg" (control-room box) and "madad Dadu 4 zakhmi bachay" (real webhook call) became help requests with place, people and needs, and got teams automatically |
| Report someone else | A phone in Sukkur reported 7 injured people at Ghotki; Rescue 1122 Ghotki was sent automatically and the reporter's phone showed it |
| No signal | A report made with the connection cut was saved ("1 message waiting") and delivered when the connection returned |
| No answer | A keypad dummy phone that received the SMS but never replied was added as "check on them" and got a team |
| Fake alert (laptop edition) | The laptop refused an unsigned alert ("only the control room may send alerts"); the phone stayed calm |
| Fake alert that got past the relay | The control room logged "BLOCKED a fake alert" and the phone ignored it; the real signed alert that followed reached the phone |
| All clear | WARNING to Bahrain and Mingora, then ALL CLEAR for Mingora: the phone showed the green all-clear screen; automatic all-clear was sent a minute after Mingora returned to Normal |
| Before-the-flood replay, 24–27 Aug 2025 | Automatic WARNING at Narowal 27 h and EVACUATE 26 h before its heaviest rain; Sialkot WARNING 20 h before; Lahore warned 15 h before as water came down the Ravi |
| Buner, 15 Aug 2025 (honest check) | The day-ahead forecast stayed Normal at Pir Baba and Daggar — models missed the cloudburst |
| NASA false alarms in the dry season | MODIS alone flagged water near Skardu and Mianwali in November; VIIRS did not, so the two-product rule now keeps them at Normal |
| NASA tile server | Sometimes answers with an error; tiles are retried and failures are not cached |
| Risk thresholds | Tuned on one monsoon only (July–August 2025); several seasons with PMD and PDMA are needed |
| Urdu texts | Written by the team with AI help; a careful proofread is still advised |

## Limits

- **A web page cannot ring a locked phone.** Android with Chrome works while the page is open; a locked iPhone
  will not ring. A native app is needed for real use.
- **The siren needs one tap first.** Browsers only allow sound after the user taps **Turn ON Khabardar**.
- **Satellites see the ground only without cloud**, and the flood products are 3-day composites at about 250–375 m,
  updated with a delay of hours. NASA rain (IMERG) is a few hours old; SMAP soil moisture is a few days old.
- **Flash floods from cloudbursts are hard to forecast.** GloFAS works on a grid of about 5 km and suits rivers
  better than small mountain streams; rain forecasts can miss a local cloudburst.
- **The thresholds are calibrated on one monsoon (2025).** A real deployment would set them with PDMA and PMD over several seasons.
- **Forecasts cannot see cloudbursts** (Buner, 15 Aug 2025): Khabardar relies on satellite rain, reports and SMS there; local rain gauges and PMD radar are needed.
- **Radar "new water" can be harmless** (a barrage pond filling, flooded paddy fields), so radar alone only raises Watch.
  Each radar pass covers part of the country, so some places have no recent radar view.
- **Arrival times are rough.** They are fixed travel times between places, not a river model; dams and barrages change them.
- **No connection, no new alert.** See "When there is no internet or no signal" above.
- **The free relay (online edition)** has rate limits, and anyone with a room link can read that room's messages.
  Do not enter real personal details on the live link.
- **GPS sharing needs HTTPS** (the online edition). On the local network, people pick their place instead.

## Use of AI assistants

**Claude (Anthropic)** was used as an AI assistant for background research, for brainstorming and comparing
project ideas, for writing the app code, and for drafting this README and the pitch materials. The team reviewed,
tested and chose what to keep.

**In the app**, no AI model runs. The risk score is the fixed rule above, the warnings are fixed templates, the
dummy phones follow simple random rules, and the voice is the phone's built-in text-to-speech (or recordings, if
added to `web/audio/`). No AI-generated images are used.

## Disclosure: APIs, libraries and services

- **Open-Meteo** Forecast, Flood, Previous Runs and Elevation APIs: weather data by Open-Meteo.com (CC BY 4.0); elevation from Copernicus DEM
- **OpenStreetMap** data via the Overpass API (© OpenStreetMap contributors, ODbL) for suggested safe points and Rescue 1122 stations
- **Web Crypto API** (ECDSA P-256, built into browsers) for signed alerts
- **GloFAS** river discharge: Copernicus Emergency Management Service (via Open-Meteo)
- **NASA GIBS** (Global Imagery Browse Services, EOSDIS): MODIS and VIIRS flood products (LANCE), GPM IMERG
  precipitation rate, SMAP L4 soil moisture, NASA JPL OPERA DSWx-S1 and RTC-S1 (from Copernicus Sentinel-1 radar),
  SEDAC Gridded Population of the World v4 (2020), SEDAC flood and landslide hazard, VIIRS snow cover and true colour;
  NASA colour keys
- **NASA EONET** natural event tracker API
- **Leaflet** 1.9.4 (map library, BSD-2, bundled in `web/vendor/`) and **OpenStreetMap** tiles © OpenStreetMap contributors
- **qrcodejs** 1.0.0 (QR code in the control room, MIT, bundled in `web/vendor/`)
- **Google Maps** directions links for routes (a plain link, no API)
- **ntfy.sh** public relay (online edition only)
- **Vercel** (free Hobby plan, static hosting of `web/`, redeploys on every push to GitHub) and **Hugging Face Spaces** (free static hosting, mirror)
- Python 3 standard library only for the local server (no extra packages)
- **AI assistant:** Claude (Anthropic), as described above

## Run it

### Local network edition (for the live pitch)

Needs only **Python 3.9+**, with no extra packages.

```
cd khabardar-demo
python server.py
```

- **Control room (laptop / projector):** `http://localhost:8000/dashboard.html`
- **Phones:** scan the QR code in the control room. It points at the laptop's address on the network, for example `http://192.168.x.x:8000/phone.html?room=…`.

Phones must be on the **same Wi-Fi or mobile hotspot** as the laptop, and the hotspot needs internet for the live
data. Use your **own hotspot** on stage, never the event Wi-Fi. If Windows asks, allow Python through the firewall
on private networks.

### Online edition

Serve the `web/` folder with any web server, for example `python -m http.server 8100 --directory web`, or upload it
to a static host. To update the live Hugging Face Space after changes:

```
hf upload Mansoorrn/khabardar web . --repo-type space
```

## Stage demo (about 2 minutes)

1. **Before the pitch:** judges scan the QR code → choose **Urdu** or **English** and a place (e.g. *Mingora*) → tap **Turn ON Khabardar**. Ask them to keep the page open and the media volume up.
2. Show the **LIVE** and **NASA satellite** badges, the risk table and **Automatic mode: ON**: “live rain, rivers and NASA satellites for 58 places, watched automatically”.
3. Click **Mingora** → **Simulate heavy rain (TEST)**, then take your hands off the laptop: “Heavy rain is detected. Nobody presses anything.” The 10-second countdown appears.
4. **Every judge's phone sounds a siren** and shows and speaks the warning, with the reason. Pause for 2 seconds. Show the **Phone wall**.
5. Ask one judge to tap **I need help** and pick *5–9 people, injured*. It appears at the top of the **Rescue queue** as HIGH, and 5 seconds later the nearest team is sent automatically: the judge's phone shows “Rescue 1122 Swat is on the way”.
6. “And the officer is always in control”: show **Cancel**, **Hold**, the manual **SEND ALERT** and **Send team now**.
   Switch the TEST off: a minute later the phones get **ALL CLEAR**.
   Press **Fake-alert test**: “Can someone fake an alert? No — every alert is signed, and this one is blocked.”
7. **Proof:** pick *Before-the-flood replay: 24–27 Aug 2025*: “Using only the forecast from a day earlier, Khabardar would have ordered Narowal to evacuate 26 hours before the heaviest rain.”
   Optional: *NASA replay 30 Aug 2022* shows the satellite flood map of 2022.
8. **Reset demo** clears alerts, answers, the rescue list, TEST scenarios and SIM phones and ends the replay (real and dummy phones stay).

## Phone tips

- **Android with Chrome** works best. Keep the page **open and the screen on**, and raise the **media volume**.
- **iPhone:** works while the page is open; a web page cannot ring a locked iPhone.
- **Voice:** for the clearest voice, record teammates reading the messages and save them as `web/audio/ur_evacuate.mp3`,
  `web/audio/en_warning.mp3`, and so on (see `web/audio/README.txt`). Without recordings, the phone's own
  text-to-speech is used. The written text always shows.

## Optional: real SMS to keypad phones

Install an Android "SMS gateway" app that offers a local HTTP API on a spare Android phone, then edit `config.json`:

```json
"sms": { "enabled": true, "url": "http://<gateway-phone-IP>:8080/message",
         "username": "...", "password": "...", "numbers": ["+92..."] }
```

When the control room sends an alert, the local server POSTs `{"message": "...", "phoneNumbers": [...]}` with basic
auth. Gateway apps use slightly different request formats, so adjust `send_sms()` in `server.py` to match the app
you choose. Only send to the numbers of people who agreed.

**Incoming SMS (help line):** set the gateway app's "incoming message webhook" to `http://<laptop-IP>:8000/sms/incoming`.
The server accepts JSON `{"from": "...", "message": "..."}` (also `sender`/`phoneNumber` and `text`/`body`, or a form)
and passes it, with the number partly hidden, to every control room active in the last 12 hours (or only to
`"room"` if set in the `sms` part of `config.json`).

## Hosting

- **Vercel** (what the live link uses): import the GitHub repository, set **Root Directory** to `web`, preset **Other**, no build
  command. Every push to `main` redeploys it.
- **Hugging Face** (the mirror): a static Space with the contents of `web/` (`web/README.md` holds the Space settings).
- Any other static web host works the same way: serve the `web/` folder as it is.

## Project structure

```
khabardar-demo/
  server.py                 # local network edition: serves web/ and a built-in message relay (standard library only)
  config.json               # port, optional SMS gateway
  web/                      # the app (also the online edition, served as is by Vercel and Hugging Face)
    index.html              # start page
    dashboard.html          # control room
    phone.html              # phone / PC receiver
    video.html              # demo video page (demo/Khabardar-Demo-Video.mp4)
    docs/                   # pitch deck (PDF)
    js/config.js            # relay setting (server.py replaces it with the local relay)
    js/villages.js          # 58 places, flood types, river paths and rescue teams
    js/safepoints.js        # suggested safe points and Rescue 1122 stations (OpenStreetMap + elevation)
    data/replay-2025-08-punjab.json   # before-the-flood replay (forecasts issued a day earlier)
    js/common.js            # alert texts, risk score, weather data, relay
    js/nasa.js              # NASA GIBS layers and pixel reading, NASA EONET events
    js/nasa-colormaps.js    # NASA colour keys (rain rate, soil moisture, flood classes)
    js/dashboard.js         # control room logic
    js/dummies.js           # dummy phones and the +25 crowd
    js/rescue.js            # rescue queue, teams, CSV
    js/phone.js             # phone logic
    css/, audio/            # styles, optional voice recordings
    vendor/                 # Leaflet 1.9.4 and qrcodejs 1.0.0 (bundled so the control room works without internet)
    sw.js                   # keeps a copy of the app on the device so it opens offline
```

## Roadmap

Native Android app that rings even when locked, automatic voice calls and SMS to keypad phones on every network,
automatic mode running on a server around the clock, PDMA approval workflow,
cell broadcast through the PTA (reaches every phone without an app), phone-to-phone Bluetooth relay, satellite SMS,
a hydraulic flood-routing model instead of fixed travel times, local rain gauges and PMD weather radar for cloudbursts,
NISAR radar once its coverage of Pakistan is complete, and official shelter and Rescue 1122 station lists.

## Sources for the figures above

World Bank, [*Preparing better for monsoons: lessons from the 2025 flash floods in Pakistan*](https://www.worldbank.org/en/news/feature/2026/09/03/preparing-better-for-monsoons-lessons-from-the-2025-flash-floods-in-pakistan)
(2026), including its survey of 1,207 households in Buner, Swat and Shangla (also on PreventionWeb); Government of
Pakistan, UNDP, World Bank and partners, *Pakistan Floods 2022 Post-Disaster Needs Assessment*.
NASA data: NASA EOSDIS GIBS, LANCE, GPM, SMAP and EONET.
