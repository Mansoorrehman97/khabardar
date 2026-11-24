---
title: Khabardar
emoji: 🚨
colorFrom: red
colorTo: indigo
sdk: static
app_file: index.html
pinned: false
short_description: Flood warning on every phone, in every language
---

# Khabardar — static online edition

Flood warning on every phone, in every language, before the water comes.
Capital Youth Expo 2026 · Hackathon 04-HK · Track 4.

- **Control room:** `dashboard.html` (laptop / projector). It shows a QR code with a private room link.
- **Phones:** scan the QR code → `phone.html?room=…` → choose language and village → **Turn ON Khabardar**.

This edition runs entirely in the browser:

- Live rain: Open-Meteo forecast API · live river discharge: GloFAS via the Open-Meteo Flood API.
- Real-time messages between the control room and phones go through the free public **ntfy.sh** relay on a random
  room topic. Anyone who knows the room link can read that room's messages, so do not enter sensitive personal data.
  The free relay has rate limits; for the live pitch, the local Python server version (in the GitHub repo) is the most reliable.
- Simulated phones and TEST scenarios are clearly labelled and only exist on the control room screen.

Full source, the local server version and documentation: see the GitHub repository.
Disclosure: Leaflet, OpenStreetMap tiles, qrcodejs, Open-Meteo, GloFAS (Copernicus EMS), ntfy.sh;
Claude (Anthropic) was used as an AI coding assistant.
