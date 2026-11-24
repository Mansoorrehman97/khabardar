---
title: Khabardar
emoji: 🚨
colorFrom: red
colorTo: indigo
sdk: static
app_file: index.html
pinned: false
short_description: Flood warning on every phone, with NASA satellite data
---

# Khabardar — online edition

Flood warning on every phone, in Urdu or English, before the water comes.
Capital Youth Expo 2026 · Hackathon 04-HK · Track 4.

- **Control room:** `dashboard.html` (laptop / projector). It shows a QR code with a private room link.
  About 85 dummy phones (labelled DUMMY) are built in, so it can be tried without real phones.
  **Automatic mode** sends alerts when a place reaches Warning (after a 10-second countdown that can be cancelled)
  and sends the nearest available rescue team to help requests; everything can also be done manually.
  It watches six flood types, shows where the flood goes next with arrival times, uses NASA radar through clouds,
  estimates people affected (NASA SEDAC), and takes help requests by SMS, from neighbours' reports and from
  phones that do not answer.
- **Phones:** scan the QR code → `phone.html?room=…` → choose Urdu or English and a place → **Turn ON Khabardar**.

This edition runs entirely in the browser:

- 58 flood-prone places across Pakistan. Live rain: Open-Meteo forecast API · live river discharge: GloFAS via
  the Open-Meteo Flood API · NASA GIBS: MODIS and VIIRS flood water, GPM IMERG rain, SMAP soil moisture,
  flood history and VIIRS true colour · NASA EONET events. NASA replays of the 30 Aug 2022 and 5 Sep 2025 floods.
- Real-time messages between the control room and phones go through the free public **ntfy.sh** relay on a random
  room topic. Anyone who knows the room link can read that room's messages, so do not enter sensitive personal data.
  The free relay has rate limits; for the live pitch, the local Python server version (in the GitHub repo) is the most reliable.
- Dummy phones, SIM phones and TEST scenarios are clearly labelled and only exist on the control room screen.
  Safe points and rescue teams are demo placeholders.

Full source, the local server version and documentation: https://github.com/Mansoorrehman97/khabardar
Disclosure: Leaflet, OpenStreetMap tiles, qrcodejs, Open-Meteo, GloFAS (Copernicus EMS), NASA GIBS / EOSDIS
(LANCE, GPM, SMAP, SEDAC), NASA EONET, ntfy.sh; Claude (Anthropic) was used as an AI coding assistant.
