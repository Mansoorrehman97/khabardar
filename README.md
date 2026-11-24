# Khabardar

**Flood warning on every phone, in Urdu or English, before the water comes.**
*Har phone, waqt se pehle.*

## Project links

- **Live app (control room):** [mansoorrn-khabardar.static.hf.space/dashboard.html](https://mansoorrn-khabardar.static.hf.space/dashboard.html)
- **Start page:** [mansoorrn-khabardar.static.hf.space](https://mansoorrn-khabardar.static.hf.space)
- **Phones:** scan the QR code shown in the control room (it opens `phone.html?room=…`)
- **Hugging Face Space:** [huggingface.co/spaces/Mansoorrn/khabardar](https://huggingface.co/spaces/Mansoorrn/khabardar)
- **Source code:** [github.com/Mansoorrehman97/khabardar](https://github.com/Mansoorrehman97/khabardar)
<!-- Add before submitting:
- **Demo video (2 min):** [watch](VIDEO-LINK)
- **Slides:** [view](DECK-LINK)
-->

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

This is a hackathon demo. The risk score is a simple, transparent rule, not a calibrated forecast. In real use,
the automatic rules would be agreed with the disaster management authority (PDMA / NDMA / Rescue 1122).

## What it does

| Step | What happens | Example |
|---|---|---|
| **1. WATCH** | Rain forecasts, river discharge and NASA satellite data (flood water, rain from space, soil wetness) for 58 places become a 0–100 risk score and a flood map | "NASA satellites see flood water around Dadu: Evacuate." |
| **2. WARN** | **Automatically** when a place reaches Warning (after a 10-second countdown an officer can cancel), or with one button. Every phone that chose that place rings with a siren, vibration and a voice and written warning in Urdu or English, the reason ("heavy rain expected", "river rising", "NASA satellites see flood water"), the nearest safe point and a route. Keypad phones get an SMS | "Khabardar! Sailab aa raha hai. Foran oonchi jagah jaayein." |
| **3. HELP** | People tap "I'm safe" or "I need help" and can add how many people are with them and who is injured, elderly, a child or pregnant. The control room ranks requests by urgency and **automatically** sends the best available team (or the officer does), and the phone shows "Rescue 1122 is on the way, about 10 minutes" | Rescue teams see exactly who needs help first, and where |

## Try it in one minute (no phone needed)

1. Open the **[control room](https://mansoorrn-khabardar.static.hf.space/dashboard.html)** on a laptop. About 85 **dummy phones** across Pakistan are already loaded (labelled DUMMY), and **Automatic mode** is ON.
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
| Flood history | NASA SEDAC Global Flood Hazard 1985–2003, via NASA GIBS | Map layer |
| Satellite photo | NASA VIIRS (NOAA-20) true colour, via NASA GIBS | Map background option |
| Recent disasters | **NASA EONET** (Earth Observatory Natural Event Tracker) | Floods, storms and landslides of the last 12 months on the map |
| Map | Leaflet 1.9.4 and © OpenStreetMap contributors | Control room map |
| Walking route | Google Maps directions link (no API key) | Route to the safe point; directions for rescue teams |
| Places, safe points, rescue teams | `web/js/villages.js`: 58 places in KP, Gilgit-Baltistan, AJK, Punjab, Sindh and Balochistan | **Safe points and rescue teams are demo placeholders** |
| Upstream replay | Marala headworks flows reported by Dawn (May and December 2025) | A labelled replay of past events |

The NASA numbers are read from NASA's map tiles: the app turns each pixel's colour back into a value with NASA's
published colour keys (`web/js/nasa-colormaps.js`). No NASA account or key is needed.

## How it works

**Risk score** (the same for every place, and easy to explain):

- Rain score = (heaviest hour of rain × 6 + next-24-hour rain × 1.2) × wet-ground factor
  - heaviest hour = the larger of the forecast and NASA's latest observed rain rate
  - wet-ground factor = 1.0 when NASA SMAP soil moisture is 0.20 m³/m³ or less, rising to 1.5 at 0.45 or more
- River score = (3-day peak discharge ÷ median of the past 30 days − 1) × 60
- Satellite score, from the share of land within 6 km that NASA sees under flood water:
  1–5% → Watch (35–50), 5% → Warning (55), about 13% or more → Evacuate
  - when both NASA flood products (MODIS and VIIRS) have a clear view, **both must agree**; this removes false
    alarms such as mountain shadows. A MODIS-only reading is capped at Watch when VIIRS should exist but is unavailable.
- Risk = the highest of the three, capped at 100 → **Normal < 30 ≤ Watch < 55 ≤ Warning < 80 ≤ Evacuate**

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
| **Online** | `web/` on any static host (Hugging Face) | The free public **ntfy.sh** relay, on a random room code | **The live link** |

Live data (Open-Meteo, NASA) is fetched by each browser in both editions, so the hotspot needs internet.

## The app

**Control room (laptop / projector)**
- Map of 58 places coloured by risk, danger zones around places at risk, NASA layers (flood water, rain from space,
  soil wetness, flood history, satellite photo, NASA EONET events) and a **NASA date** picker with replays of
  the **30 Aug 2022** Sindh and Balochistan floods and **5 Sep 2025** Punjab floods
- **Automatic mode**: automatic alerts (level and countdown can be changed) with **Send now** / **Cancel**, and
  automatic rescue dispatch with **Hold**; both can be switched off
- **Manual alert**: places or a drawn zone, **Select places at Warning+** in one click, level, English and Urdu
  preview, SMS preview, and how many phones it will reach
- **Who got the warning**: phones, warned, received, safe, need help, no answer yet, counted live
- **Rescue queue**: requests ranked HIGH / MEDIUM / LOW by injuries, rising water, elderly, pregnant, children,
  group size and waiting time; **Send nearest team** (boat teams preferred when water is rising) with an estimated
  arrival time, **Mark rescued**, **Show on map**, **Directions for team**, **Assign nearest teams to all** and
  **Download rescue list (CSV)**
- **Phone wall**: every phone in the alert as a mini phone that rings in its language; click one to see its screen
- **Flood risk by place** table, sortable by region, with rain, river and NASA columns
- **Dummy phones** (about 85, labelled DUMMY), **+25 crowd** (labelled SIM), **Upstream replay**, **Reset demo**

**Phone / PC receiver (any browser)**
- Setup in Urdu or English: place (grouped by province), family place, name, optional GPS
- Shows the current risk for your place and what NASA satellites see near you
- Full-screen alert: loud siren, vibration, spoken and written warning, nearest safe point, distance and a
  **Show route** button
- **I'm safe** / **I need help**; for help, a fresh GPS fix and a short form (number of people, injured, elderly or
  disabled, children, pregnant woman, water rising)
- "Rescue team … is on the way — about N minutes" and "You are marked as rescued" messages from the control room

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
| Automatic voice call to keypad phones | **Not built yet**: on the roadmap |
| Safe points and rescue teams | **Demo placeholders**: to be replaced with PDMA shelters and real Rescue 1122 stations |
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
| NASA false alarms in the dry season | MODIS alone flagged water near Skardu and Mianwali in November; VIIRS did not, so the two-product rule now keeps them at Normal |
| NASA tile server | Sometimes answers with an error; tiles are retried and failures are not cached |
| Risk thresholds | **Not calibrated** against past floods |
| Urdu texts | Written by the team with AI help; a careful proofread is still advised |

## Limits

- **A web page cannot ring a locked phone.** Android with Chrome works while the page is open; a locked iPhone
  will not ring. A native app is needed for real use.
- **The siren needs one tap first.** Browsers only allow sound after the user taps **Turn ON Khabardar**.
- **Satellites see the ground only without cloud**, and the flood products are 3-day composites at about 250–375 m,
  updated with a delay of hours. NASA rain (IMERG) is a few hours old; SMAP soil moisture is a few days old.
- **Flash floods from cloudbursts are hard to forecast.** GloFAS works on a grid of about 5 km and suits rivers
  better than small mountain streams; rain forecasts can miss a local cloudburst.
- **The thresholds are a demo rule.** A real deployment would set them with PDMA and PMD using past floods.
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

- **Open-Meteo** Forecast API and Flood API: weather data by Open-Meteo.com (CC BY 4.0)
- **GloFAS** river discharge: Copernicus Emergency Management Service (via Open-Meteo)
- **NASA GIBS** (Global Imagery Browse Services, EOSDIS): MODIS and VIIRS flood products (LANCE), GPM IMERG
  precipitation rate, SMAP L4 soil moisture, SEDAC Global Flood Hazard, VIIRS true colour; NASA colour keys
- **NASA EONET** natural event tracker API
- **Leaflet** 1.9.4 (map library) and **OpenStreetMap** tiles © OpenStreetMap contributors
- **qrcodejs** 1.0.0 (QR code in the control room)
- **Google Maps** directions links for routes (a plain link, no API)
- **ntfy.sh** public relay (online edition only)
- **Hugging Face Spaces** (free static hosting)
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
7. **NASA replay:** pick *30 Aug 2022*: “This is what NASA satellites saw in the 2022 floods. Khabardar would have warned all of Sindh automatically.”
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

## Other hosting

- `Dockerfile`: for hosts that run containers (for example a Hugging Face PRO Docker Space). It reads the `PORT` variable.
- `render.yaml`: ready for Render (**New → Blueprint**). Render asks for a payment card even for its free plan,
  and the free plan sleeps after about 15 minutes without visitors.

## Project structure

```
khabardar-demo/
  server.py                 # local network edition: serves web/ and a built-in message relay (standard library only)
  config.json               # port, optional SMS gateway
  web/                      # the app (also the online edition, uploaded to Hugging Face as is)
    index.html              # start page
    dashboard.html          # control room
    phone.html              # phone / PC receiver
    js/config.js            # relay setting (server.py replaces it with the local relay)
    js/villages.js          # 58 places, demo safe points and demo rescue teams
    js/common.js            # alert texts, risk score, weather data, relay
    js/nasa.js              # NASA GIBS layers and pixel reading, NASA EONET events
    js/nasa-colormaps.js    # NASA colour keys (rain rate, soil moisture, flood classes)
    js/dashboard.js         # control room logic
    js/dummies.js           # dummy phones and the +25 crowd
    js/rescue.js            # rescue queue, teams, CSV
    js/phone.js             # phone logic
    css/, audio/            # styles, optional voice recordings
  Dockerfile, render.yaml, requirements.txt   # other hosting options
```

## Roadmap

Native Android app that rings even when locked, automatic voice calls and SMS to keypad phones on every network,
automatic mode running on a server around the clock, "all clear" messages when the danger passes, PDMA approval workflow, real shelter and Rescue 1122 station lists, Sentinel-1 radar flood mapping through cloud,
and an "Ask Khabardar" voice helper.

## Sources for the figures above

World Bank, *Preparing better for monsoons: lessons from the 2025 flash floods in Pakistan* (2026); PreventionWeb
report on a survey of 1,207 households in Buner, Swat and Shangla; Government of Pakistan, UNDP, World Bank and
partners, *Pakistan Floods 2022 Post-Disaster Needs Assessment*; Dawn reports on Chenab flows at Marala (2025).
NASA data: NASA EOSDIS GIBS, LANCE, GPM, SMAP and EONET.
