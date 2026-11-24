/* Khabardar — DUMMY phones: demo phones spread across Pakistan that receive alerts and answer automatically,
   so the control room can be shown at scale without real handsets. They exist only on this screen and are
   always labelled DUMMY (the "+25 crowd" phones are labelled SIM). Their answers are random, not real people. */

const Dummies = (() => {
  const NAMES = {  // names by region; every dummy phone uses Urdu or English
    kp: ["Gul Bibi", "Zar Khan", "Shah Wali", "Bakht Zada", "Noor Jehan", "Fazal Rabi", "Sher Ali", "Zarina", "Amir Zeb", "Palwasha", "Taj Muhammad", "Shaista", "Hayat Khan", "Mehnaz"],
    sindh: ["Allah Bachayo", "Mai Bhagi", "Ghulam Rasool", "Sassui", "Ali Nawaz", "Rani Bibi", "Mumtaz Ali", "Hawa", "Dodo Khan", "Sughra", "Bashir Ahmed", "Marvi", "Qadir Bux", "Zubeda"],
    other: ["Muhammad Aslam", "Shabana", "Rana Tariq", "Nasreen", "Abdul Ghafoor", "Kausar Parveen", "Jan Muhammad", "Bibi Hani", "Karim Shah", "Zainab", "Sher Baz", "Farzana", "Imran", "Saima", "Bilal", "Rukhsana", "Naveed", "Asma", "Ayesha", "Hamza", "Sana", "Usman"]
  };
  const region = (v) => (v.province === "KP" ? "kp" : v.province === "Sindh" ? "sindh" : "other");
  const EXTRA = { mingora: 4, madyan: 2, bahrain: 2, daggar: 2, dadu: 2, sukkur: 2, jacobabad: 2, multan: 2, nowshera: 2, karachi: 1, jhang: 1 };
  const FAMILY = [
    { name: "Son in Karachi", home: "karachi", watch: "dadu", lang: "ur" },
    { name: "Daughter in Lahore", home: "lahore", watch: "mingora", lang: "en" },
    { name: "Brother in Rawalpindi", home: "rawalpindi", watch: "madyan", lang: "ur" },
    { name: "Mother in Multan", home: "multan", watch: "jhang", lang: "ur" }
  ];

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let _list = null;
  function list() {
    if (_list) return _list;
    const r = rng(20261202), used = {}, out = [];
    const pick = (reg) => { const l = NAMES[reg]; const n = (used[reg] = (used[reg] || 0) + 1); return l[(n - 1) % l.length] + (n > l.length ? " " + Math.ceil(n / l.length) : ""); };
    for (const v of VILLAGES) {
      for (let i = 0; i <= (EXTRA[v.id] || 0); i++) {
        const lang = r() < 0.9 ? "ur" : "en";
        out.push({ id: `dm_${v.id}_${i}`, name: pick(region(v)), villages: [v.id], lang, dummy: true, device: r() < 0.25 ? "keypad" : "smart",
          lat: +(v.lat + (r() - 0.5) * 0.02).toFixed(5), lon: +(v.lon + (r() - 0.5) * 0.024).toFixed(5), joined: 0 });
      }
    }
    FAMILY.forEach((f, i) => {
      const v = VMAP[f.home];
      out.push({ id: "dm_family_" + i, name: f.name, villages: [f.home, f.watch], lang: f.lang, dummy: true, device: "smart", family: true,
        lat: v.lat + 0.008, lon: v.lon - 0.01, joined: 0 });
    });
    return (_list = out);
  }

  function key() { return "kh_dummies_" + S.room; }
  function isOn() { return localStorage.getItem(key()) !== "0"; }
  function setOn(on) {
    localStorage.setItem(key(), on ? "1" : "0");
    for (const p of list()) { if (on) S.phones[p.id] = Object.assign({}, p); else delete S.phones[p.id]; }
    if (!on) for (const k of Object.keys(S.responses)) if (k.split("|")[1].startsWith("dm_")) delete S.responses[k];
    $("dummyBtn").textContent = `Dummy phones: ${on ? "ON" : "OFF"}`;
    addLog(on ? `${list().length} DUMMY phones loaded across Pakistan (labelled DUMMY; they answer automatically)` : "Dummy phones removed");
    scheduleRender();
  }
  function init() { if (isOn()) { for (const p of list()) S.phones[p.id] = Object.assign({}, p); } $("dummyBtn").textContent = `Dummy phones: ${isOn() ? "ON" : "OFF"}`; }

  /* +25 SIM crowd around the selected places (or the Swat demo villages). */
  function addCrowd(ids) {
    ids = ids.length ? ids : ["mingora", "madyan", "bahrain"];
    const n0 = Object.values(S.phones).filter((p) => p.sim).length;
    for (let i = 0; i < 25; i++) {
      const v = VMAP[ids[Math.floor(Math.random() * ids.length)]];
      const id = "sim" + Math.random().toString(36).slice(2, 10);
      S.phones[id] = { id, name: `Simulated ${n0 + i + 1}`, villages: [v.id], lang: Math.random() < 0.9 ? "ur" : "en",
        sim: true, device: Math.random() < 0.2 ? "keypad" : "smart", lat: v.lat + (Math.random() - 0.5) * 0.03, lon: v.lon + (Math.random() - 0.5) * 0.036, joined: Date.now() / 1000 };
    }
    addLog(`Added 25 SIMULATED phones around ${ids.map((i) => VMAP[i].name).join(", ")} (only on this screen)`);
    scheduleRender();
  }

  /* What a dummy / SIM phone does after an alert: receive, ring (or SMS), then answer — or stay silent. */
  function simulate(alert, p) {
    const k = alert.id + "|" + p.id, r = rng(hashStr(k) + (p.sim ? Date.now() : 0));
    const step = (ms, fn) => setTimeout(() => { const x = S.responses[k]; if (x) { fn(x); scheduleRender(); } }, ms);
    const answer = (status) => (x) => {
      if (RANK[status] < RANK[x.status]) return;
      x.status = status; x.t_answer = Date.now() / 1000;
      if (status === "help") {
        const v = VMAP[x.village_id], a = r() * Math.PI * 2, d = 0.004 + r() * 0.01;
        x.lat = +(v.lat + Math.sin(a) * d).toFixed(5); x.lon = +(v.lon + Math.cos(a) * d * 1.15).toFixed(5); x.gps = p.device !== "keypad";
        if (!x.gps) { x.lat = null; x.lon = null; }
        x.t_help = Date.now() / 1000;
        x.details = { people: [1, 2, 3, 4, 5, 6, 7, 9, 12][Math.floor(r() * 9)], injured: r() < 0.22, elderly: r() < 0.3, children: r() < 0.45, pregnant: r() < 0.08, water: r() < 0.38 };
        x.rescue = x.rescue || { status: "waiting" };
      }
      addLog(`${p.name} — ${status === "safe" ? "SAFE" : "NEEDS HELP"} (${VMAP[x.village_id].name}) ${p.sim ? "[SIM]" : "[DUMMY]"}${p.device === "keypad" ? " via SMS reply" : ""}`);
    };
    const reach = (status, channel) => (x) => { if (RANK[status] > RANK[x.status]) { x.status = status; x.channel = channel || x.channel; } };
    if (p.device === "keypad") {
      step(1500 + r() * 3000, reach("delivered", "sms"));
      if (p.family) return;
      const u = r();
      if (u < 0.5) step(14000 + r() * 16000, answer("safe"));
      else if (u < 0.64) step(12000 + r() * 14000, answer("help"));
    } else {
      step(400 + r() * 1400, reach("delivered", "app"));
      step(1300 + r() * 2200, reach("played", "app"));
      if (p.family) return;
      const u = r();
      if (u < 0.72) step(5000 + r() * 20000, answer("safe"));
      else if (u < 0.87) step(6000 + r() * 16000, answer("help"));
    }
  }

  return { list, isOn, setOn, init, addCrowd, simulate };
})();
