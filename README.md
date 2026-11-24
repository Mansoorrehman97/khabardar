# Khabardar

**Flood warning on every phone, in every language, before the water comes.**
*Har phone, har zubaan, waqt se pehle.*

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
and nobody knows who actually received them. Khabardar turns live rain and river data into a **village-level
alert** that rings every phone with a **siren and a spoken warning in Urdu, Pashto, Sindhi or English**, tells
people **where to go**, and lets them answer **"I'm safe"** or **"I need help"**. The control room then knows
who was warned, who heard the siren and who still needs rescue.

This is a hackathon demo. The risk score is a simple, transparent rule, not a calibrated forecast. In real
use, the alert would be sent by a disaster management officer (PDMA / NDMA / Rescue 1122).

## What it does

| Step | What happens | Example |
|---|---|---|
| **1. WATCH** | Live rain forecasts and river discharge for each village become a 0–100 risk score | "Rain in Swat: 58 mm in one hour expected. Risk: Evacuate." |
| **2. WARN** | The officer presses one button. Every phone that chose that village rings with a siren, vibration, and a voice and written warning in its own language, plus the nearest safe point and a walking route | "Khabardar! Sailab aa raha hai. Foran oonchi jagah jaayein." |
| **3. HELP** | People tap "I'm safe" or "I need help". The control room counts receipts and shows a rescue queue on the map | Rescue teams see exactly who needs help, and where |

## Try it in one minute

1. Open the **[control room](https://mansoorrn-khabardar.static.hf.space/dashboard.html)** on a laptop.
2. Scan the QR code with a phone → choose a language and a village (for example *Mingora*) → tap **Turn ON Khabardar**. Keep the page open and raise the media volume.
3. In the control room, click **Mingora** on the map → **Simulate heavy rain (TEST)** → choose **Evacuate now** → **SEND ALERT**.
4. The phone sounds a siren and shows and speaks the warning. Tap **I'm safe**, and its dot turns green on the map.

## Built on open data

| Data | Source | Use |
|---|---|---|
| Hourly rain forecast | [Open-Meteo](https://open-meteo.com) Forecast API (CC BY 4.0) | Rain score for each village |
| River discharge: past 30 days and next 7 days | GloFAS v4, Copernicus Emergency Management Service, via the Open-Meteo Flood API | River score (peak compared with normal) |
| Map | Leaflet 1.9.4 and © OpenStreetMap contributors | Control room map |
| Walking route | Google Maps directions link (opened by the phone's "Show route" button; no API key) | Route to the safe point |
| Villages and safe points | `data/villages.json`: 12 demo villages in Swat, Buner, Shangla, Kabul River, Chenab and Sindh | Who gets warned and where to go. **Safe points are placeholders.** |
| Upstream replay | Marala headworks flows reported by Dawn (May and December 2025) | A labelled replay of past events, not live data |

## How it works

**Risk score** (the same for every village, and easy to explain):

- Rain score = largest 1-hour rain (mm) × 6 + next-24-hour rain (mm) × 1.2
- River score = (3-day peak discharge ÷ median of the past 30 days − 1) × 60
- Risk = the higher of the two, capped at 100 → **Normal < 30 ≤ Watch < 55 ≤ Warning < 80 ≤ Evacuate**

**Who gets the alert.** Each phone picks its home village and, optionally, a family member's village. An
alert for a village reaches every phone that chose it, so a son in Karachi or Dubai is told too. Phones in
other villages are not disturbed.

**Messages.** Control room → phones: the alert. Phones → control room: "siren played" receipt, then "I'm safe"
or "I need help" with location if shared. The phone writes the warning text itself in its own language, so
only a short message travels.

**Two editions of the same app:**

| Edition | Folder | Messages travel through | Best for |
|---|---|---|---|
| **Local server** | root: `server.py`, `static/` | The laptop itself (Server-Sent Events), no internet relay | **The live pitch**, on your own hotspot |
| **Static online** | `static-site/` | The free public **ntfy.sh** relay, on a random room code | **The live link**, hosted free on Hugging Face |

## The app

**Control room (laptop / projector)**
- Map of villages coloured by live risk, with a **LIVE data** badge
- **Send alert**: level (Watch / Warning / Evacuate now), villages, and a preview of the message in English and Urdu
- **Who got the warning**: warned → siren played → safe / need help, counted live
- **Rescue queue** of everyone who tapped "I need help", their village, and whether they shared GPS
- **Risk table** with rain and river figures for every village
- **Upstream replay**: the Chenab flow drops at Marala in 2025, labelled as a replay
- **Simulate heavy rain (TEST)** and **+25 simulated phones (SIM)**, both clearly labelled, and **Reset demo**
- QR code for phones to join

**Phone / PC receiver (any browser)**
- Setup in Urdu, Pashto, Sindhi or English: village, family village, name, optional GPS
- Full-screen alert: siren, vibration, spoken warning, written warning, nearest safe point, and a **Show route** button (Google Maps walking directions)
- **I'm safe** / **I need help** buttons
- Screen stays awake while protected (where the browser allows it)

## What is real and what is simulated

| Part | Status |
|---|---|
| Rain forecast for each village | **Real, live**: Open-Meteo |
| River discharge compared with normal | **Real, live**: GloFAS via Open-Meteo |
| Alerts to phones, siren, voice, receipts, "I'm safe / need help" | **Real**: works live on any phone browser |
| Heavy-rain scenario | **TEST**: simulated values, labelled on screen |
| +25 phones | **SIMULATED**: labelled "SIM" |
| SMS to keypad phones | **Simulated** unless an SMS gateway is set up (see below) |
| Automatic voice call to keypad phones | **Not built yet**: on the roadmap |
| Upstream replay figures | Past events as reported by Dawn, labelled as a replay |
| Safe points | **Demo placeholders**: to be replaced with PDMA-designated shelters |

## What we tested, including what is weak

| Check | Result |
|---|---|
| Five phones joined over the local server in different languages, plus 10 simulated phones | Each phone got the alert in its own language |
| Alert for a Swat village with a phone registered in Sukkur | The Sukkur phone was **not** alerted, as intended |
| Live link on Hugging Face, real phone | Phone received the Urdu warning; control room counted "warned" and "siren played" |
| Reload the control room during a demo | State rebuilt from the relay history |
| Reset demo | Phones return to the protected screen; test data cleared |
| Pashto and Sindhi texts | **Not yet checked by native speakers** |
| Risk thresholds | **Not calibrated** against past floods |

## Limits

- **A web page cannot ring a locked phone.** Android with Chrome works while the page is open; a locked iPhone
  will not ring. A native app is needed for real use.
- **The siren needs one tap first.** Browsers only allow sound after the user taps **Turn ON Khabardar**.
- **Flash floods from cloudbursts are hard to forecast.** GloFAS works on a grid of about 5 km and suits rivers
  better than small mountain streams; rain forecasts can miss a local cloudburst.
- **The thresholds are a demo rule.** A real deployment would set them with PDMA and PMD using past floods.
- **The free relay (static edition)** has rate limits, and anyone with a room link can read that room's
  messages. Do not enter real personal details on the live link.
- **GPS sharing needs HTTPS.** On the local network, people pick their village instead.

## Use of AI assistants

**Claude (Anthropic)** was used as an AI assistant for background research, for brainstorming and comparing
project ideas, for writing the app code (both editions), and for drafting this README and the pitch
materials. The team reviewed, tested and chose what to keep.

**In the app**, no AI model runs. The risk score is the fixed rule above, the warnings are fixed templates,
and the voice is the phone's built-in text-to-speech (or recordings, if added to `audio/`). No AI-generated
images are used.

## Disclosure: APIs, libraries and services

- **Open-Meteo** Forecast API and Flood API: weather data by Open-Meteo.com (CC BY 4.0)
- **GloFAS** river discharge: Copernicus Emergency Management Service (via Open-Meteo)
- **Leaflet** 1.9.4 (map library) and **OpenStreetMap** tiles © OpenStreetMap contributors
- **qrcodejs** 1.0.0 (QR code in the control room)
- **Google Maps** directions links for the "Show route" button (a plain link, no API)
- **ntfy.sh** public relay (static online edition only)
- **Hugging Face Spaces** (free static hosting)
- Python 3 standard library only for the server (no extra packages)
- **AI assistant:** Claude (Anthropic), as described above

## Run it

### Local server edition (for the live pitch)

Needs only **Python 3.9+**, with no extra packages.

```
cd khabardar-demo
python server.py
```

The terminal prints two links:

- **Control room (laptop / projector):** `http://localhost:8000/dashboard`
- **Phones join at:** `http://<your-laptop-IP>:8000/phone`. The control room also shows this link as a **QR code**.

Phones must be on the **same Wi-Fi or mobile hotspot** as the laptop. Use your **own hotspot** on stage, never
the event Wi-Fi. If Windows asks, allow Python through the firewall on private networks.

### Static online edition

Open `static-site/index.html` through any web server, for example:

```
python -m http.server 8100 --directory static-site
```

To update the live Hugging Face Space after changes:

```
hf upload Mansoorrn/khabardar static-site . --repo-type space
```

## Stage demo (about 90 seconds)

1. **Before the pitch:** judges scan the QR code → choose their language and a village (e.g. *Mingora*) → tap **Turn ON Khabardar**. Ask them to keep the page open and the media volume up.
2. Show the **LIVE data** badge and the village risk table (real rain and river data).
3. Click **Mingora** on the map → in the popup click **Simulate heavy rain (TEST)**. The village turns red (clearly labelled TEST).
4. Optional: click **+25 simulated phones** (clearly labelled SIM) so the map shows a crowd.
5. With Mingora selected, choose **Evacuate now** and press **SEND ALERT**.
6. **Every judge's phone sounds a siren** and shows and speaks the warning. Pause for 2 seconds.
7. Ask judges to tap **I'm safe**. Dots turn **green** on the map; one "I need help" appears in the **Rescue queue**.
8. Click **Upstream replay** to show the Chenab/Marala flow drops (past events, labelled as a replay).
9. **Reset demo** clears alerts, responses, test scenarios and simulated phones (real phones stay joined).

## Phone tips

- **Android with Chrome** works best. Keep the page **open and the screen on**, and raise the **media volume**.
- **iPhone:** works while the page is open; a web page cannot ring a locked iPhone.
- **Voice:** for the best Pashto and Sindhi voice, record teammates reading the messages and save them as
  `static/audio/ps_warning.mp3`, `static/audio/ur_evacuate.mp3`, and so on (see `static/audio/README.txt`).
  Without recordings, the phone's own text-to-speech is used. The written text always shows.

## Optional: real SMS to keypad phones

Install an Android "SMS gateway" app that offers a local HTTP API on a spare Android phone, then edit `config.json`:

```json
"sms": { "enabled": true, "url": "http://<gateway-phone-IP>:8080/message",
         "username": "...", "password": "...", "numbers": ["+92..."] }
```

The server POSTs `{"message": "...", "phoneNumbers": [...]}` with basic auth. Gateway apps use slightly
different request formats, so adjust `send_sms()` in `server.py` to match the app you choose. Only send to the
numbers of people who agreed.

## Other hosting

- `Dockerfile`: for hosts that run containers (for example a Hugging Face PRO Docker Space). It reads the `PORT` variable.
- `render.yaml`: ready for Render (**New → Blueprint**). Render asks for a payment card even for its free plan,
  and the free plan sleeps after about 15 minutes without visitors.

## Project structure

```
khabardar-demo/
  server.py            # local server edition: live data, risk score, alerts, real-time streams (Python standard library only)
  config.json          # port, cache time, optional SMS gateway
  data/villages.json   # demo villages and demo safe points
  static/              # local edition pages: dashboard.* (control room), phone.* (receiver), audio/, replay/
  static-site/         # static online edition (Hugging Face): index.html, dashboard.html, phone.html, js/, css/, audio/
  Dockerfile, render.yaml, requirements.txt   # other hosting options
```

## Roadmap

Native Android app that rings even when locked, automatic voice calls and SMS to keypad phones on every
network, PDMA approval workflow, Sentinel-1 satellite watch of upstream reservoirs and glacial lakes, and an
"Ask Khabardar" voice helper.

## Sources for the figures above

World Bank, *Preparing better for monsoons: lessons from the 2025 flash floods in Pakistan* (2026); PreventionWeb
report on a survey of 1,207 households in Buner, Swat and Shangla; Government of Pakistan, UNDP, World Bank and
partners, *Pakistan Floods 2022 Post-Disaster Needs Assessment*; Dawn reports on Chenab flows at Marala (2025).
