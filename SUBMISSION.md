# Khabardar: submission sheet

Paste-ready answers for the Capital Youth Expo 2026 submission (Hackathon 04-HK).
**Deadline: 28 Nov 2026, 11:59 PM.** Finale: 2 Dec 2026 (5-minute pitch + 2-minute Q&A).

## Links

| Item | Link | Status |
|---|---|---|
| Public code repository (with README and disclosure) | https://github.com/Mansoorrehman97/khabardar | Ready |
| Live deployment (control room) | https://mansoorrn-khabardar.static.hf.space/dashboard.html | Ready |
| Start page | https://mansoorrn-khabardar.static.hf.space | Ready |
| Hugging Face Space page | https://huggingface.co/spaces/Mansoorrn/khabardar | Ready |
| Demo video (2 minutes or less) | *add link* | To do |
| Pitch deck (PDF or PPTX) | *add link or upload file* | To do |

## Basics

| Field | Answer |
|---|---|
| Project name | Khabardar |
| Tagline | Flood warning on every phone, in Urdu or English, before the water comes. |
| Urdu tagline | Har phone, waqt se pehle. |
| Track | Track 4: Smart Agriculture & Climate |
| Team name, members, institution, contact | *fill in* |

## One line (about 25 words)

Khabardar uses live forecasts and NASA satellites to warn people about floods on their own phone, with a siren and
a voice, and helps rescuers reach those who need help.

## Short description (about 50 words)

Khabardar watches 58 flood-prone places in Pakistan with live rain and river forecasts and NASA satellite data.
One button makes every phone in the danger area ring with a siren and a spoken warning in Urdu or English, with
the nearest safe point. People reply "I'm safe" or "I need help", and the nearest rescue team is sent.

## Full description (about 200 words)

In the August 2025 flash floods in Buner, Swat and Shangla, a survey of 1,207 households found that 85 out of
100 families got no warning. Pakistan's warnings today mostly arrive as written SMS on one network, for a whole
district, and nobody knows who received them.

Khabardar does three jobs. **Watch:** for 58 flood-prone places it combines rain forecasts (Open-Meteo), river
discharge (GloFAS) and NASA satellite data — flood water seen by MODIS and VIIRS, rain from space (GPM IMERG) and
soil wetness (SMAP) — into a simple 0–100 risk score and a flood map. **Warn:** a disaster officer presses one
button and every phone that chose that place rings with a siren, vibration and a spoken and written warning in
Urdu or English, plus the nearest safe point and a route; keypad phones get an SMS. **Help:** people tap "I'm
safe" or "I need help" and say who is injured, elderly, a child or pregnant. The control room ranks requests,
sends the nearest rescue team, and the person's phone shows that help is on the way.

It runs in any phone browser with no app install. A NASA replay of the 2022 floods shows the risk map turning
Sindh red from real satellite data, and the live demo makes the judges' own phones ring.

## Problem

- **Too late:** warnings often come at the last minute, or after the water.
- **Too wide:** a whole district is warned, so people do not know if it is their village.
- **Text only:** written SMS on one network; people who cannot read miss it.
- **One-way:** nobody knows who received the warning or who needs rescue, or where.

## Solution

- Place-level risk from live rain and river data **plus NASA satellites** that see flood water, rain and wet ground.
- One-button alert to every phone in the danger area: siren, vibration, voice and text in Urdu or English; SMS for keypad phones.
- Tells people what to do: the nearest safe point, its distance and a route.
- Two-way: "I'm safe" / "I need help" with GPS and help details, a rescue queue ranked by urgency, nearest-team
  dispatch with an estimated arrival time, and "help is on the way" back on the person's phone.

## How it works (technical)

- **Risk score:** rain score = (heaviest hour × 6 + next-24-hour rain × 1.2) × wet-ground factor (NASA SMAP);
  heaviest hour uses the forecast or NASA's observed rain rate, whichever is larger. River score = (3-day peak
  discharge ÷ 30-day median − 1) × 60. Satellite score from the share of land within 6 km under flood water in
  NASA's flood products (1–5% Watch, 5% Warning, about 13% Evacuate; MODIS and VIIRS must agree when both have a
  clear view). Risk = the highest, capped at 100.
- **NASA data without a key:** the app reads NASA GIBS map tiles in the browser and turns pixel colours back into
  values with NASA's published colour keys. NASA EONET adds recent floods and storms to the map.
- **Alerts:** the control room sends a short message; each phone builds the warning in its language, plays a Web
  Audio siren and speaks it with the phone's text-to-speech (or recorded audio), and sends back receipts, answers
  and help details. The rescue status flows back to the phone.
- **One app, two editions:** the same web pages run online (free Hugging Face static Space, messages through the
  ntfy.sh relay on a random room code) or on a laptop (`python server.py`, standard library only, with a built-in
  relay) for the live pitch on a private hotspot.

## What is new (Innovation)

The full chain in one tool: live forecasts **and NASA satellites** → place-level risk → every phone rings → proof
of who heard it → "I'm safe / I need help" with details → ranked rescue queue → nearest team → "help is on the
way" on the person's phone. Today's systems in Pakistan do parts of this (SMS on one network, district-wide
alerts); none closes the loop back to the rescue team and the person waiting.

## Impact

- 2022 floods: 33 million people affected; about $30 billion in damage and losses.
- 2025 flash floods: 85 of 100 surveyed families in Buner, Swat and Shangla got no warning.
- Khabardar targets the gap between a forecast existing and a family hearing it in time, and between a call for
  help and a team arriving.

## Business model

Free for people. Disaster management authorities (NDMA, PDMAs), telecom companies and aid organisations pay for
the control room, delivery by SMS and voice call, and setup and training for their districts.

## What is real and what is simulated

| Real | Simulated or placeholder, and labelled |
|---|---|
| Rain forecast and river discharge for 58 places | Dummy phones and their answers (DUMMY) |
| NASA flood water, rain, soil wetness and events | +25 crowd (SIM) |
| NASA replays of the 2022 and 2025 floods (past satellite data) | Heavy-rain TEST scenario |
| Alerts to real phones, siren, voice, receipts | SMS to keypad phones (unless a gateway is set up) |
| "I'm safe / I need help", help details, rescue status on the phone | Safe points and rescue teams (demo placeholders) |
| | Arrival times (estimates) |
| | Voice calls to keypad phones (roadmap, not built) |

## Disclosure: APIs, libraries and AI assistants

- **APIs and data:** Open-Meteo Forecast API and Flood API (CC BY 4.0); GloFAS river discharge, Copernicus
  Emergency Management Service; NASA GIBS (MODIS and VIIRS flood products from LANCE, GPM IMERG, SMAP L4, SEDAC
  flood hazard, VIIRS true colour); NASA EONET; OpenStreetMap tiles; Google Maps directions links (no API).
- **Libraries:** Leaflet 1.9.4; qrcodejs 1.0.0; Python 3 standard library.
- **Services:** ntfy.sh public relay (online edition); Hugging Face Spaces (hosting); GitHub.
- **AI assistant:** Claude (Anthropic), used for background research, brainstorming and comparing project ideas,
  writing the app code, and drafting the README and pitch materials. No AI model runs inside the app.

## How judges can try it

1. Open the control room on a laptop: https://mansoorrn-khabardar.static.hf.space/dashboard.html
2. No phone needed: in **Map layers → NASA date**, choose **NASA replay: 30 Aug 2022**, click **Select places at
   Warning+**, then **SEND ALERT**, and open the **Phone wall** and **Rescue queue** tabs.
3. With a phone: scan the QR code, choose the place *Mingora*, tap **Turn ON Khabardar**; in the control room click
   **Mingora** → **Simulate heavy rain (TEST)** → **Evacuate now** → **SEND ALERT**. The phone rings; tap
   **I need help**, then press **Send nearest team** in the control room.

## Video plan (2 minutes or less)

| Time | Show | Say |
|---|---|---|
| 0:00–0:12 | Flood photo or news headline, then title | "In 2025, 85 out of 100 families in Buner and Swat got no flood warning." |
| 0:12–0:25 | Control room: LIVE and NASA badges, 58 places | "Khabardar watches 58 places with live forecasts and NASA satellites." |
| 0:25–0:45 | NASA replay 30 Aug 2022: blue flood water, Sindh turns red | "This is what NASA satellites saw in 2022. Khabardar turns it into a warning." |
| 0:45–1:20 | Phone joins by QR → TEST heavy rain → SEND ALERT → phone siren and voice (record with sound); Phone wall | "One button, and every phone in the village rings." |
| 1:20–1:45 | Phone: I need help + details → Rescue queue HIGH → Send nearest team → phone shows team on the way | "Rescuers know who needs help first, and the family knows help is coming." |
| 1:45–2:00 | Links on screen | "Free for people. Built for Pakistan's floods. Khabardar." |

Label the heavy-rain scenario as a TEST and the dummy phones as DUMMY in the video, as the app does.

## Before you press Submit

- [ ] Open all links in a private browser window and check they load without a login.
- [ ] Add the video and deck links to the table above and to the README's Project links.
- [ ] Proofread the Urdu warning texts.
- [ ] Fill in the team details.
- [ ] Read the "Use of AI assistants" section in the README and adjust it if it does not match what happened.
