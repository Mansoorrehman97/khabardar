/* Khabardar — places watched by the demo (58 flood-prone towns and villages across Pakistan).
   Coordinates are approximate town centres. SAFE POINTS ARE DEMO PLACEHOLDERS: a real deployment must use the
   shelters designated by the PDMA / district administration. Rescue teams are generated per district (demo). */

const SAFE_NAMES = [
  ["Govt. Boys High School", "گورنمنٹ بوائز ہائی اسکول"],
  ["District Hospital Ground", "ضلعی ہسپتال کا میدان"],
  ["Relief Camp", "امدادی کیمپ"],
  ["Govt. Degree College", "گورنمنٹ ڈگری کالج"],
  ["Sports Stadium", "اسپورٹس اسٹیڈیم"],
  ["Govt. Girls High School", "گورنمنٹ گرلز ہائی اسکول"],
  ["Embankment Relief Camp", "پشتے پر امدادی کیمپ"],
  ["Hilltop Mosque Ground", "پہاڑی مسجد کا میدان"]
];

// [id, name, Urdu name, district, province, river / hazard, lat, lon, safe-name index, safe offset lat, safe offset lon]
const _PLACES = [
  // Khyber Pakhtunkhwa
  ["mingora", "Mingora", "مینگورہ", "Swat", "KP", "Swat River", 34.7717, 72.3600, 0, 0.012, 0.014],
  ["bahrain", "Bahrain", "بحرین", "Swat", "KP", "Swat River", 35.2072, 72.5464, 7, 0.008, 0.010],
  ["madyan", "Madyan", "مدین", "Swat", "KP", "Swat River", 35.1386, 72.5361, 7, 0.008, 0.009],
  ["kalam", "Kalam", "کالام", "Swat", "KP", "Swat River", 35.4875, 72.5847, 3, 0.008, 0.008],
  ["daggar", "Daggar", "ڈگر", "Buner", "KP", "Flash floods (Barandu)", 34.5040, 72.4840, 1, 0.008, 0.011],
  ["pirbaba", "Pir Baba", "پیر بابا", "Buner", "KP", "Flash floods (cloudburst)", 34.4800, 72.4500, 7, 0.008, 0.011],
  ["alpuri", "Alpuri", "الپوری", "Shangla", "KP", "Flash floods", 34.9033, 72.6417, 3, 0.007, 0.010],
  ["nowshera", "Nowshera", "نوشہرہ", "Nowshera", "KP", "Kabul River", 34.0153, 71.9747, 4, 0.014, 0.016],
  ["charsadda", "Charsadda", "چارسدہ", "Charsadda", "KP", "Swat & Kabul rivers", 34.1480, 71.7400, 0, 0.012, 0.013],
  ["peshawar", "Peshawar (Budhni Nullah)", "پشاور (بڈھنی نالہ)", "Peshawar", "KP", "Budhni Nullah / Kabul River", 34.0080, 71.5780, 4, -0.010, 0.014],
  ["chitral", "Chitral", "چترال", "Chitral", "KP", "Chitral River / glacial floods", 35.8510, 71.7860, 3, 0.008, -0.010],
  ["dir", "Dir", "دیر", "Upper Dir", "KP", "Panjkora River", 35.2060, 71.8760, 7, 0.007, 0.009],
  ["dikhan", "Dera Ismail Khan", "ڈیرہ اسماعیل خان", "D.I. Khan", "KP", "Indus / hill torrents", 31.8320, 70.9020, 1, 0.012, 0.016],
  ["dasu", "Dasu", "داسو", "Upper Kohistan", "KP", "Indus River", 35.2920, 73.2900, 7, 0.008, 0.010],
  ["balakot", "Balakot", "بالاکوٹ", "Mansehra", "KP", "Kunhar River", 34.5480, 73.3520, 0, 0.008, 0.010],
  // Gilgit-Baltistan
  ["gilgit", "Gilgit", "گلگت", "Gilgit", "GB", "Gilgit River", 35.9200, 74.3080, 3, 0.010, 0.012],
  ["karimabad", "Karimabad (Hunza)", "کریم آباد (ہنزہ)", "Hunza", "GB", "Hunza River / glacial lakes", 36.3170, 74.6650, 7, 0.006, 0.008],
  ["skardu", "Skardu", "سکردو", "Skardu", "GB", "Indus River", 35.2970, 75.6330, 4, 0.010, 0.012],
  // Azad Kashmir
  ["muzaffarabad", "Muzaffarabad", "مظفرآباد", "Muzaffarabad", "AJK", "Neelum & Jhelum rivers", 34.3700, 73.4710, 3, 0.009, 0.011],
  // Punjab
  ["marala", "Marala (Chenab)", "مرالہ (چناب)", "Sialkot", "Punjab", "Chenab River", 32.6730, 74.4640, 6, 0.012, 0.016],
  ["wazirabad", "Wazirabad", "وزیرآباد", "Gujranwala", "Punjab", "Chenab River", 32.4430, 74.1200, 0, 0.011, 0.013],
  ["sialkot", "Sialkot (Nullah Aik)", "سیالکوٹ (نالہ ایک)", "Sialkot", "Punjab", "Nullah Aik & Palkhu", 32.4940, 74.5220, 5, 0.012, -0.014],
  ["narowal", "Narowal", "نارووال", "Narowal", "Punjab", "Ravi River / Nullah Dek", 32.1020, 74.8730, 3, 0.012, -0.015],
  ["lahore", "Lahore (Shahdara)", "لاہور (شاہدرہ)", "Lahore", "Punjab", "Ravi River", 31.6200, 74.2900, 4, -0.014, 0.020],
  ["kasur", "Kasur", "قصور", "Kasur", "Punjab", "Sutlej River", 31.1160, 74.4500, 1, 0.012, -0.014],
  ["jhelum", "Jhelum", "جہلم", "Jhelum", "Punjab", "Jhelum River", 32.9400, 73.7270, 3, 0.010, -0.013],
  ["rawalpindi", "Rawalpindi (Nullah Leh)", "راولپنڈی (نالہ لئی)", "Rawalpindi", "Punjab", "Nullah Leh (urban flooding)", 33.6000, 73.0500, 4, 0.012, 0.014],
  ["attock", "Attock", "اٹک", "Attock", "Punjab", "Indus & Kabul confluence", 33.7660, 72.3600, 0, 0.010, 0.012],
  ["mianwali", "Mianwali", "میانوالی", "Mianwali", "Punjab", "Indus River", 32.5860, 71.5430, 1, 0.012, 0.014],
  ["jhang", "Jhang", "جھنگ", "Jhang", "Punjab", "Chenab & Jhelum rivers", 31.2700, 72.3170, 6, 0.013, -0.015],
  ["multan", "Multan", "ملتان", "Multan", "Punjab", "Chenab River", 30.1960, 71.4750, 4, 0.012, 0.016],
  ["muzaffargarh", "Muzaffargarh", "مظفرگڑھ", "Muzaffargarh", "Punjab", "Chenab & Indus rivers", 30.0720, 71.1930, 2, 0.012, -0.014],
  ["bahawalnagar", "Bahawalnagar", "بہاولنگر", "Bahawalnagar", "Punjab", "Sutlej River", 29.9980, 73.2530, 0, -0.012, 0.015],
  ["layyah", "Layyah", "لیہ", "Layyah", "Punjab", "Indus River", 30.9650, 70.9390, 2, 0.011, 0.015],
  ["taunsa", "Taunsa", "تونسہ", "Taunsa", "Punjab", "Hill torrents / Indus", 30.7040, 70.6510, 6, 0.011, -0.014],
  ["dgkhan", "Dera Ghazi Khan", "ڈیرہ غازی خان", "D.G. Khan", "Punjab", "Koh-e-Suleman hill torrents", 30.0460, 70.6400, 1, 0.012, 0.015],
  ["rajanpur", "Rajanpur", "راجن پور", "Rajanpur", "Punjab", "Hill torrents / Indus", 29.1040, 70.3300, 2, 0.012, 0.015],
  // Sindh
  ["sukkur", "Sukkur", "سکھر", "Sukkur", "Sindh", "Indus River", 27.7052, 68.8574, 2, 0.012, 0.013],
  ["dadu", "Dadu", "دادو", "Dadu", "Sindh", "Indus / Manchar Lake", 26.7319, 67.7750, 6, 0.011, 0.014],
  ["ghotki", "Ghotki", "گھوٹکی", "Ghotki", "Sindh", "Indus River", 28.0060, 69.3160, 2, -0.012, 0.014],
  ["kashmore", "Kashmore", "کشمور", "Kashmore", "Sindh", "Indus River", 28.4330, 69.5830, 6, 0.011, 0.014],
  ["jacobabad", "Jacobabad", "جیکب آباد", "Jacobabad", "Sindh", "Rain floods / Kirthar torrents", 28.2820, 68.4380, 2, 0.012, 0.014],
  ["larkana", "Larkana", "لاڑکانہ", "Larkana", "Sindh", "Indus River", 27.5590, 68.2120, 1, 0.012, 0.014],
  ["khairpur", "Khairpur", "خیرپور", "Khairpur", "Sindh", "Rain floods / Indus", 27.5290, 68.7590, 0, 0.012, 0.014],
  ["mehar", "Mehar", "میہڑ", "Dadu", "Sindh", "Indus / Manchar Lake", 27.1800, 67.8200, 6, 0.011, 0.014],
  ["sanghar", "Sanghar", "سانگھڑ", "Sanghar", "Sindh", "Rain floods", 26.0460, 68.9480, 2, 0.011, 0.014],
  ["hyderabad", "Hyderabad", "حیدرآباد", "Hyderabad", "Sindh", "Indus River", 25.3960, 68.3770, 4, 0.012, 0.016],
  ["badin", "Badin", "بدین", "Badin", "Sindh", "Rain floods / LBOD drain", 24.6560, 68.8370, 2, 0.011, 0.014],
  ["thatta", "Thatta", "ٹھٹھہ", "Thatta", "Sindh", "Indus River (delta)", 24.7470, 67.9240, 7, 0.011, 0.013],
  ["karachi", "Karachi (Malir)", "کراچی (ملیر)", "Karachi", "Sindh", "Malir & Lyari rivers (urban flooding)", 24.8610, 67.0100, 4, 0.014, 0.018],
  // Balochistan
  ["quetta", "Quetta", "کوئٹہ", "Quetta", "Balochistan", "Urban flash floods", 30.1830, 66.9960, 4, 0.012, 0.015],
  ["sibi", "Sibi", "سبی", "Sibi", "Balochistan", "Nari River", 29.5430, 67.8770, 0, 0.011, 0.014],
  ["deraallahyar", "Dera Allahyar", "ڈیرہ اللہ یار", "Jaffarabad", "Balochistan", "Rain floods / canals", 28.3730, 68.3500, 2, 0.011, 0.014],
  ["deramuradjamali", "Dera Murad Jamali", "ڈیرہ مراد جمالی", "Naseerabad", "Balochistan", "Rain floods / canals", 28.5470, 68.2230, 6, 0.011, 0.014],
  ["jhalmagsi", "Jhal Magsi", "جھل مگسی", "Jhal Magsi", "Balochistan", "Hill torrents", 28.2820, 67.4440, 2, 0.010, 0.012],
  ["uthal", "Uthal", "اوتھل", "Lasbela", "Balochistan", "Porali River", 25.8070, 66.6220, 1, 0.010, 0.013],
  ["turbat", "Turbat", "تربت", "Kech", "Balochistan", "Kech River", 26.0010, 63.0480, 3, 0.010, 0.013],
  ["zhob", "Zhob", "ژوب", "Zhob", "Balochistan", "Zhob River", 31.3410, 69.4490, 0, 0.010, 0.013]
];

const VILLAGES = _PLACES.map(([id, name, name_ur, district, province, river, lat, lon, si, dlat, dlon]) => ({
  id, name, name_ur, district, province, river, lat, lon,
  safe: { name: SAFE_NAMES[si][0], name_ur: SAFE_NAMES[si][1], lat: +(lat + dlat).toFixed(4), lon: +(lon + dlon).toFixed(4) }
}));

/* Flood types for each place (Pakistan has several kinds of flood, each with its own warning signs). */
const _HAZ = {
  flash: ["mingora", "bahrain", "madyan", "kalam", "daggar", "pirbaba", "alpuri", "chitral", "dir", "dasu", "balakot", "gilgit", "karimabad", "skardu", "muzaffarabad", "quetta", "zhob", "uthal", "turbat", "sibi", "jhalmagsi"],
  urban: ["karachi", "lahore", "rawalpindi", "peshawar", "hyderabad", "quetta", "sialkot", "multan"],
  // glacier melt / glacial lake outburst: daytime temperature (°C) above which melt becomes dangerous at this valley town
  glof: { chitral: 36, gilgit: 37, karimabad: 30, skardu: 32, kalam: 26, dasu: 39, bahrain: 30 },
  // hill torrents: rain is watched in the hills upstream, where the torrent starts
  torrent: { dgkhan: [29.99, 69.95, "Koh-e-Suleman"], rajanpur: [29.25, 69.85, "Koh-e-Suleman"], taunsa: [30.75, 69.95, "Koh-e-Suleman"],
             dikhan: [31.95, 70.25, "Sheikh Budin hills"], jhalmagsi: [27.85, 66.75, "Mula River hills"], sibi: [30.0, 68.2, "Nari River hills"],
             jacobabad: [28.55, 67.55, "Kirthar & Bolan hills"], deraallahyar: [28.6, 67.7, "Kirthar & Bolan hills"], deramuradjamali: [28.9, 67.7, "Bolan hills"] },
  coastal: ["karachi", "thatta", "badin"]
};
const HAZARD_NAMES = { river: "river flood", flash: "flash flood / cloudburst", urban: "city flooding", glof: "glacier melt / glacial lake outburst", torrent: "hill torrent", coastal: "coastal storm & surge" };
for (const v of VILLAGES) {
  v.hz = ["river"];
  if (_HAZ.flash.includes(v.id)) v.hz.push("flash");
  if (_HAZ.urban.includes(v.id)) v.hz.push("urban");
  if (_HAZ.glof[v.id]) { v.hz.push("glof"); v.heat = _HAZ.glof[v.id]; }
  if (_HAZ.torrent[v.id]) { v.hz.push("torrent"); v.up = _HAZ.torrent[v.id]; }
  if (_HAZ.coastal.includes(v.id)) v.hz.push("coastal");
}

/* Where flood water goes next: [from, to, rough flood-wave travel time in hours, river]. Travel times are rough
   estimates for the demo; a real system would use the river authority's routing times. */
const RIVER_LINKS = [
  ["kalam", "bahrain", 3, "Swat River"], ["bahrain", "madyan", 1, "Swat River"], ["madyan", "mingora", 3, "Swat River"],
  ["daggar", "mingora", 6, "Barandu → Swat River"], ["pirbaba", "daggar", 1, "Barandu"], ["alpuri", "mingora", 8, "Shangla streams → Swat River"],
  ["mingora", "charsadda", 8, "Swat River"], ["dir", "charsadda", 12, "Panjkora → Swat River"], ["charsadda", "nowshera", 4, "Kabul River"],
  ["chitral", "peshawar", 36, "Chitral (Kunar) → Kabul River"], ["peshawar", "nowshera", 6, "Kabul River"], ["nowshera", "attock", 6, "Kabul River"],
  ["karimabad", "gilgit", 5, "Hunza River"], ["gilgit", "dasu", 10, "Gilgit River → Indus"], ["skardu", "dasu", 14, "Indus River"],
  ["dasu", "attock", 30, "Indus (Tarbela)"], ["attock", "mianwali", 14, "Indus River"], ["mianwali", "dikhan", 18, "Indus River"],
  ["dikhan", "layyah", 10, "Indus River"], ["layyah", "taunsa", 12, "Indus River"], ["taunsa", "dgkhan", 10, "Indus River"],
  ["dgkhan", "rajanpur", 20, "Indus River"], ["rajanpur", "kashmore", 14, "Indus (Guddu)"], ["kashmore", "ghotki", 8, "Indus River"],
  ["ghotki", "sukkur", 12, "Indus (Sukkur barrage)"], ["sukkur", "khairpur", 4, "Indus River"], ["sukkur", "larkana", 14, "Indus River"],
  ["larkana", "mehar", 10, "Indus River"], ["mehar", "dadu", 6, "Indus / Manchar"], ["dadu", "hyderabad", 48, "Indus (Kotri)"],
  ["hyderabad", "thatta", 14, "Indus River"],
  ["balakot", "muzaffarabad", 5, "Kunhar → Jhelum"], ["muzaffarabad", "jhelum", 30, "Jhelum (Mangla)"], ["jhelum", "jhang", 40, "Jhelum River"],
  ["marala", "wazirabad", 6, "Chenab River"], ["sialkot", "wazirabad", 10, "Nullah Aik → Chenab"], ["wazirabad", "jhang", 36, "Chenab River"],
  ["jhang", "multan", 24, "Chenab River"], ["multan", "muzaffargarh", 8, "Chenab River"], ["muzaffargarh", "kashmore", 40, "Chenab → Panjnad → Indus"],
  ["narowal", "lahore", 18, "Ravi River"], ["lahore", "multan", 72, "Ravi → Chenab"],
  ["kasur", "bahawalnagar", 36, "Sutlej River"], ["bahawalnagar", "kashmore", 80, "Sutlej → Panjnad → Indus"],
  ["jhalmagsi", "deramuradjamali", 12, "Mula River torrents"], ["sibi", "deramuradjamali", 10, "Nari River"],
  ["deramuradjamali", "deraallahyar", 8, "flood water over the plains"], ["deraallahyar", "jacobabad", 10, "flood water over the plains"],
  ["jacobabad", "larkana", 24, "flood water over the plains"]
];

/* Real places instead of placeholders, where OpenStreetMap has them (js/safepoints.js): the highest named school,
   college or hospital within 4 km, and real Rescue 1122 stations. Still suggestions — the PDMA must confirm them. */
if (typeof SAFE_REAL !== "undefined") {
  for (const v of VILLAGES) {
    const s = SAFE_REAL[v.id];
    // a building lower than the town centre is not a safe point (allow ±3 m: the height data is not exact on flat plains)
    if (s && (s.gain == null || s.gain >= -3)) v.safe = { name: s.name, name_ur: s.name_ur || s.name, lat: s.lat, lon: s.lon, gain: s.gain, kind: s.kind, osm: s.osm, real: true };
  }
}

const PROVINCE_NAMES = { KP: "Khyber Pakhtunkhwa", GB: "Gilgit-Baltistan", AJK: "Azad Kashmir", Punjab: "Punjab", Sindh: "Sindh", Balochistan: "Balochistan" };
const PROVINCE_UR = { KP: "خیبر پختونخوا", GB: "گلگت بلتستان", AJK: "آزاد کشمیر", Punjab: "پنجاب", Sindh: "سندھ", Balochistan: "بلوچستان" };

/* Demo rescue teams: one per district, based a few km from the first place listed in that district.
   Riverine districts in Punjab and Sindh also get a boat team. */
const RESCUE_TEAMS = (() => {
  const seen = new Set(), out = [];
  for (const v of VILLAGES) {
    if (seen.has(v.district)) continue;
    seen.add(v.district);
    const real = typeof TEAMS_REAL !== "undefined" && TEAMS_REAL[v.id] && !/shop/i.test(TEAMS_REAL[v.id].name) ? TEAMS_REAL[v.id] : null;
    out.push(real ? { id: "t_" + v.id, name: `Rescue 1122 ${v.district}`, kind: "rescue", lat: real.lat, lon: real.lon, real: true, osm: real.osm, osmName: real.name }
                  : { id: "t_" + v.id, name: `Rescue 1122 ${v.district}`, kind: "rescue", lat: +(v.lat - 0.02).toFixed(4), lon: +(v.lon - 0.025).toFixed(4) });
    if ((v.province === "Sindh" || v.province === "Punjab") && /Indus|Chenab|Ravi|Sutlej|Jhelum/.test(v.river)) {
      out.push({ id: "b_" + v.id, name: `PDMA boat team ${v.district}`, kind: "boat", lat: +(v.lat + 0.018).toFixed(4), lon: +(v.lon - 0.03).toFixed(4) });
    }
  }
  return out;
})();
