Optional satellite replay images for the "Upstream replay" window on the dashboard.

1. Export before/after images (for example Sentinel-1 radar water extent of upstream reservoirs, or Sentinel-2
   images of a glacial lake) from Google Earth Engine or Copernicus Browser as PNG/JPG.
2. Put the files in this folder.
3. Create manifest.json in this folder like:

{
  "images": [
    {"file": "salal_2025-04-28.png", "caption": "Salal reservoir, 28 Apr 2025 (Sentinel-1)"},
    {"file": "salal_2025-05-06.png", "caption": "Salal reservoir, 6 May 2025 (Sentinel-1)"}
  ]
}

Always label them as past imagery (a replay), not live data.
