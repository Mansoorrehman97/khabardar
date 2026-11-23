# Khabardar — flood warning on every phone, in every language, before the water comes

**Capital Youth Expo 2026 · Hackathon 04-HK · Track 4 (Smart Agriculture & Climate)**

Khabardar does three things:

1. **WATCH** — live rain forecasts (Open-Meteo) and live river discharge (GloFAS) for each village, turned into a simple risk score.
2. **WARN** — an officer sends an alert from the control room; every phone in the danger area gets a **loud siren, vibration and a voice + written warning in Urdu, Pashto, Sindhi or English**, plus the nearest safe point and a walking route.
3. **HELP** — people tap **“I'm safe”** or **“I need help”**; the control room sees who was warned, who heard the siren, who is safe, and a rescue queue on the map.

---

## Run it (no installation needed)

Requires only **Python 3.9+** (no extra packages).

```
cd khabardar-demo
python server.py
```

The terminal prints two links:

- **Control room (laptop / projector):** `http://localhost:8000/dashboard`
- **Phones join at:** `http://<your-laptop-IP>:8000/phone` — the dashboard also shows this link as a **QR code**.

Phones must be on the **same Wi-Fi / mobile hotspot** as the laptop. Use your **own hotspot** on stage, never the event Wi-Fi.
If Windows asks, allow Python through the firewall on private networks.

## Stage demo (about 90 seconds)

1. **Before the pitch:** judges scan the QR code → choose their language and a village (e.g. *Mingora*) → tap **Turn ON Khabardar**. Ask them to keep the page open and media volume up.
2. Show the **LIVE data** badge and the village risk table (real rain + river data).
3. Click **Mingora** on the map → in the popup click **Simulate heavy rain (TEST)** — the village turns red (clearly labelled TEST).
4. Optional: click **+25 simulated phones** (clearly labelled SIM) so the map shows a crowd.
5. Make sure Mingora is selected, choose **Evacuate now**, press **SEND ALERT**.
6. **Every judge's phone sounds a siren** and shows/speaks the warning. Pause for 2 seconds.
7. Ask judges to tap **I'm safe** — dots turn **green** on the map; one “I need help” appears in the **Rescue queue**.
8. Click **Upstream replay** to show the Chenab/Marala flow drops (past events, labelled as a replay).
9. **Reset demo** clears alerts, responses, test scenarios and simulated phones (real phones stay joined).

## What is real and what is simulated (say this honestly)

| Part | Status |
|---|---|
| Rain forecast per village | **Real, live** — Open-Meteo forecast API |
| River discharge vs normal | **Real, live** — GloFAS via Open-Meteo Flood API |
| Alerts to phones, siren, voice, delivery receipts, “I'm safe / need help” | **Real** — works live on any phone browser |
| Heavy-rain scenario | **TEST** — simulated values, labelled on screen |
| +25 phones | **SIMULATED** — labelled “SIM” |
| SMS to keypad phones | **Simulated** unless an SMS gateway is configured (see below) |
| Upstream replay figures | Past events as reported in the news (Dawn) — labelled as a replay |
| Safe points | **Demo placeholders** — replace with PDMA-designated shelters |

## Phone tips (important for the demo)

- **Android + Chrome** works best. Keep the page **open and the screen on**; raise **media volume**.
- The siren can only start after the user taps **Turn ON Khabardar** once (browser rule).
- **iPhone:** works while the page is open; a web page cannot ring a locked iPhone. (A native app is on the roadmap.)
- **Voice:** for the best Pashto/Sindhi voice, record teammates reading the messages and save them as
  `static/audio/ps_warning.mp3`, `static/audio/ur_evacuate.mp3`, etc. (see `static/audio/README.txt`).
  Without files, the phone's own text-to-speech is used (Urdu/English usually available; the written text always shows).
- Exact GPS sharing only works over **HTTPS** (e.g. the cloud deployment). On the local network, people pick their village instead.

## Optional: real SMS to keypad phones

Install an Android “SMS gateway” app that offers a local HTTP API on a spare Android phone, then edit `config.json`:

```json
"sms": { "enabled": true, "url": "http://<gateway-phone-IP>:8080/message",
         "username": "...", "password": "...", "numbers": ["+92..."] }
```

The server POSTs `{"message": "...", "phoneNumbers": [...]}` with basic auth. Different gateway apps use slightly
different request formats — adjust `send_sms()` in `server.py` to match the app you choose. Only send to numbers of people who agreed.

## Deploy a live link (for the submission)

The rules ask for a public repository **and** a working live link. This folder is ready for **Render** (free):
it contains `render.yaml`, an empty `requirements.txt` and reads the `PORT` variable automatically.

1. Put this folder in a **public GitHub repository** (git push, or GitHub website → *Add file → Upload files* and drag the folder's contents in).
2. Sign in at **render.com** with your GitHub account → **New → Blueprint** → choose the repository → **Apply**.
   (Or **New → Web Service**: runtime *Python*, build `pip install -r requirements.txt`, start `python server.py`, plan *Free*.)
3. After the build, Render gives a link like `https://khabardar-xxxx.onrender.com`.
   - Control room: `https://…onrender.com/dashboard` · Phones: `https://…onrender.com/phone` (the dashboard QR code uses this link).
   - HTTPS also enables GPS sharing and lets phones join over mobile data — no shared Wi-Fi needed.

Notes: the free plan **sleeps after ~15 minutes without visitors**; the first visit then takes about a minute.
Open the dashboard 2–3 minutes before the pitch. Demo data lives in memory and resets when the service restarts.
For the live pitch, running locally on your own hotspot is the most reliable; keep the Render link for the submission
and as a backup.

## Project structure

```
khabardar-demo/
  server.py            # Python standard library only: live data, risk engine, alerts, real-time streams (SSE)
  config.json          # port, cache time, optional SMS gateway
  data/villages.json   # demo villages + demo safe points
  static/dashboard.*   # officer control room (map, send alert, who got the warning, risk table)
  static/phone.*       # phone / PC receiver (siren, voice, I'm safe / I need help)
  static/audio/        # optional voice recordings
  static/replay/       # optional satellite replay images + manifest.json
```

## Risk score (transparent, explainable)

- Rain score = max 1-hour rain (mm) × 6 + next-24-hour rain (mm) × 1.2
- River score = (3-day peak discharge ÷ past-30-day median − 1) × 60
- Risk = the higher of the two, capped at 100 → **Normal < 30 ≤ Watch < 55 ≤ Warning < 80 ≤ Evacuate**

This is a simple, honest demo rule. A real deployment would calibrate thresholds with PDMA/PMD using past floods.

## Before the pitch — please check

- **Pashto and Sindhi texts** in `server.py` and `static/phone.js` must be checked by native speakers.
- Replace demo safe points with real shelters for any village you show.
- Practise the demo 10 times; keep a backup screen recording.

## Disclosure (required by the rulebook)

- **Open-Meteo** forecast API and Flood API — weather data by Open-Meteo.com (CC BY 4.0)
- **GloFAS** river discharge — Copernicus Emergency Management Service (via Open-Meteo)
- **Leaflet** 1.9.4 (map library) and **OpenStreetMap** map tiles © OpenStreetMap contributors
- **qrcodejs** 1.0.0 (QR code on the dashboard)
- **AI coding assistant:** Claude (Anthropic) was used to help write this code during the build window.

## Roadmap

Native Android app (rings even when locked), automatic voice calls to keypad phones, real SMS on all networks,
Sentinel-1 satellite watch of upstream reservoirs and glacial lakes, PDMA approval workflow, “Ask Khabardar” voice assistant.
