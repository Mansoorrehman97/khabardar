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
| Tagline | Flood warning on every phone, in every language, before the water comes. |
| Urdu tagline | Har phone, har zubaan, waqt se pehle. |
| Track | Track 4: Smart Agriculture & Climate |
| Team name, members, institution, contact | *fill in* |

## One line (about 25 words)

Khabardar warns people about floods on their own phone, with a siren and a voice in their own language, tells
them where to go, and shows rescuers who is safe.

## Short description (about 50 words)

Khabardar turns live rain and river data into village-level flood alerts. One button makes every phone in the
danger area ring with a siren and a spoken warning in Urdu, Pashto, Sindhi or English, with the nearest safe
point. People reply "I'm safe" or "I need help", so the control room knows who still needs rescue.

## Full description (about 200 words)

In the August 2025 flash floods in Buner, Swat and Shangla, a survey of 1,207 households found that 85 out of
100 families got no warning. Pakistan's warnings today mostly arrive as written SMS on one network, for a whole
district, and nobody knows who received them.

Khabardar does three jobs. **Watch:** it reads live rain forecasts (Open-Meteo) and river discharge (GloFAS,
Copernicus) for each village and turns them into a simple 0–100 risk score. **Warn:** a disaster officer presses
one button and every phone that chose that village rings with a siren, vibration and a spoken and written
warning in the person's own language, plus the nearest safe point and a walking route. Relatives in other
cities who chose the village are told too. **Help:** people tap "I'm safe" or "I need help"; the control room
counts who was warned, who heard the siren and who is safe, and lists a rescue queue on the map.

It runs in any phone browser with no app install, so it works today. The live demo makes the judges' own phones
ring. Next steps are a native Android app that rings when locked, voice calls to keypad phones, and working
with PDMAs.

## Problem

- **Too late:** warnings often come at the last minute, or after the water.
- **Too wide:** a whole district is warned, so people do not know if it is their village.
- **Text only:** written SMS on one network; people who cannot read miss it.
- **One-way:** nobody knows who received the warning or who needs rescue.

## Solution

- Village-level risk from live rain and river data.
- One-button alert to every phone in the danger area: siren, vibration, voice and text in Urdu, Pashto, Sindhi or English.
- Tells people what to do: the nearest safe point and a walking route.
- Two-way: "I'm safe" / "I need help", receipts and a rescue queue in the control room.

## How it works (technical)

- **Risk score:** rain score = largest 1-hour rain × 6 + next-24-hour rain × 1.2; river score = (3-day peak
  discharge ÷ 30-day median − 1) × 60; risk = the higher, capped at 100. Normal < 30 ≤ Watch < 55 ≤ Warning < 80 ≤ Evacuate.
- **Live data:** Open-Meteo Forecast API (hourly rain) and Open-Meteo Flood API (GloFAS river discharge, past 30
  days and next 7 days), fetched for all villages in one request.
- **Alerts:** the control room sends a short alert message; each phone builds the warning in its own language,
  plays a Web Audio siren and speaks it with the phone's text-to-speech (or recorded audio), and sends back
  receipts and answers.
- **Two editions:** a local Python server (standard library only, Server-Sent Events) for the live pitch on a
  private hotspot, and a browser-only edition on a free Hugging Face static Space that passes messages through
  the ntfy.sh relay on a random room code.

## What is new (Innovation)

The full chain in one tool: live data → village-level alert → every phone rings in its own language → proof of
who heard it → "I'm safe / I need help" → rescue map. Today's systems in Pakistan do parts of this (SMS on one
network, district-wide alerts); none closes the loop back to the rescue team.

## Impact

- 2022 floods: 33 million people affected; about $30 billion in damage and losses.
- 2025 flash floods: 85 of 100 surveyed families in Buner, Swat and Shangla got no warning.
- Khabardar targets the gap between a forecast existing and a family hearing it in time, in a language they understand.

## Business model

Free for people. Disaster management authorities (NDMA, PDMAs), telecom companies and aid organisations pay for
the control room, delivery by SMS and voice call, and setup and training for their districts.

## What is real and what is simulated

| Real, live | Simulated or placeholder, and labelled |
|---|---|
| Rain forecast and river discharge for each village | Heavy-rain TEST scenario |
| Alerts to real phones, siren, voice, receipts | +25 SIM phones |
| "I'm safe / I need help" and rescue queue | SMS to keypad phones (unless a gateway is set up) |
| | Safe points (demo placeholders) |
| | Upstream replay (past events from news reports) |
| | Voice calls to keypad phones (roadmap, not built) |

## Disclosure: APIs, libraries and AI assistants

- **APIs and data:** Open-Meteo Forecast API and Flood API (CC BY 4.0); GloFAS river discharge, Copernicus
  Emergency Management Service; OpenStreetMap tiles; Google Maps directions links (no API).
- **Libraries:** Leaflet 1.9.4; qrcodejs 1.0.0; Python 3 standard library.
- **Services:** ntfy.sh public relay (static edition); Hugging Face Spaces (hosting); GitHub.
- **AI assistant:** Claude (Anthropic), used for background research, brainstorming and comparing project ideas,
  writing the app code, and drafting the README and pitch materials. No AI model runs inside the app.

## How judges can try it

1. Open the control room on a laptop: https://mansoorrn-khabardar.static.hf.space/dashboard.html
2. Scan the QR code with a phone, choose a language and the village *Mingora*, and tap **Turn ON Khabardar**.
3. In the control room: click **Mingora** → **Simulate heavy rain (TEST)** → **Evacuate now** → **SEND ALERT**.
4. The phone rings. Tap **I'm safe** and watch the dot turn green.

## Video plan (2 minutes or less)

| Time | Show | Say |
|---|---|---|
| 0:00–0:15 | Flood photo or news headline, then title | "In 2025, 85 out of 100 families in Buner and Swat got no flood warning." |
| 0:15–0:30 | Start page | "Khabardar warns every phone, in every language, before the water comes." |
| 0:30–0:50 | Control room: LIVE data badge, risk table | "This is live rain and river data for each village." |
| 0:50–1:30 | Phone joins by QR → TEST heavy rain → SEND ALERT → phone siren and voice (record the phone with sound) | "One button, and every phone in the village rings, in its own language." |
| 1:30–1:45 | Tap "I'm safe" → dot turns green; "I need help" → rescue queue | "Now rescuers know who is safe and who needs help." |
| 1:45–2:00 | Links on screen | "Free for people. Built for Pakistan's floods. Khabardar: har phone, har zubaan, waqt se pehle." |

Label the heavy-rain scenario as a TEST in the video, as the app does.

## Before you press Submit

- [ ] Open all links in a private browser window and check they load without a login.
- [ ] Add the video and deck links to the table above and to the README's Project links.
- [ ] Have a native speaker check the Pashto and Sindhi warning texts.
- [ ] Fill in the team details.
- [ ] Read the "Use of AI assistants" section in the README and adjust it if it does not match what happened.
