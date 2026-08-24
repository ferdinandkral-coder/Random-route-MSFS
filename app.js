/* ============================================================
   RANDOM ROUTE — app.js
   Fleet management, realistic route generation, 3D globe (globe.gl)
   ============================================================ */

/* ---------- aircraft categories ----------
   types      = OurAirports "type" values this category is realistically
                allowed to operate from/to
   minRwy     = minimum longest-runway length (ft) required at BOTH ends
                (airports with unknown runway length are given the benefit
                of the doubt and still included)
   cruiseKt/enduranceMin = sensible defaults, fully editable per aircraft
------------------------------------------------------------- */
const CATEGORIES = {
  glider:     { code: 'GLD', label: 'Segelflugzeug',        cruiseKt: 70,  enduranceMin: 120, types: ['small_airport', 'medium_airport'],                 minRwy: 0 },
  ultralight: { code: 'ULM', label: 'Ultraleicht',          cruiseKt: 80,  enduranceMin: 150, types: ['small_airport', 'medium_airport'],                 minRwy: 0 },
  ga_single:  { code: 'SEP', label: 'Einmot (GA)',          cruiseKt: 120, enduranceMin: 240, types: ['small_airport', 'medium_airport'],                 minRwy: 1800 },
  ga_twin:    { code: 'MEP', label: 'Zweimot (GA)',         cruiseKt: 180, enduranceMin: 300, types: ['small_airport', 'medium_airport', 'large_airport'], minRwy: 2500 },
  turboprop:  { code: 'TBP', label: 'Turboprop',            cruiseKt: 280, enduranceMin: 300, types: ['small_airport', 'medium_airport', 'large_airport'], minRwy: 3500 },
  bizjet:     { code: 'BIZ', label: 'Business Jet',         cruiseKt: 450, enduranceMin: 360, types: ['medium_airport', 'large_airport'],                  minRwy: 5000 },
  narrowbody: { code: 'NB',  label: 'Narrowbody Airliner',  cruiseKt: 460, enduranceMin: 360, types: ['medium_airport', 'large_airport'],                  minRwy: 6500 },
  widebody:   { code: 'WB',  label: 'Widebody Airliner',    cruiseKt: 490, enduranceMin: 480, types: ['large_airport'],                                    minRwy: 8500 },
  helicopter: { code: 'HEL', label: 'Helikopter',           cruiseKt: 120, enduranceMin: 90,  types: ['small_airport', 'medium_airport', 'large_airport'], minRwy: 0 },
};

const FLEET_KEY = 'rr_fleet_v1';

/* ---------- state ---------- */
let fleet = loadFleet();
let airports = [];
let airportPool = {};   // category -> filtered airport array
let globe = null;
let currentAltitude = 2.2;
let lastRoute = null;

/* ================= utils ================= */
function loadFleet() {
  try { return JSON.parse(localStorage.getItem(FLEET_KEY)) || []; }
  catch { return []; }
}
function saveFleet() { localStorage.setItem(FLEET_KEY, JSON.stringify(fleet)); }

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function randInt(n) { return Math.floor(Math.random() * n); }
function fmtHM(hoursFloat) {
  const totalMin = Math.round(hoursFloat * 60);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}
function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('is-visible'), ms);
}

/* ================= airport data ================= */
async function loadAirports() {
  const res = await fetch('airports.json');
  airports = await res.json();
  document.getElementById('airportCountLabel').textContent = airports.length.toLocaleString('de-DE');
  buildAirportPools();
}
function buildAirportPools() {
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    airportPool[key] = airports.filter(a =>
      cat.types.includes(a.type) && (a.rwy_ft === 0 || a.rwy_ft >= cat.minRwy)
    );
  }
}

/* ================= route generation ================= */
function generateRoute(aircraft) {
  const cat = CATEGORIES[aircraft.category];
  const pool = airportPool[aircraft.category] || [];
  if (pool.length < 2) return { error: 'Für diese Kategorie sind zu wenige Flughäfen bekannt.' };

  const cruiseKmh = aircraft.cruiseKt * 1.852;
  const rangeKm = cruiseKmh * (aircraft.enduranceMin / 60) * 0.9; // 10% reserve
  const minDist = Math.max(30, rangeKm * 0.1);

  if (minDist >= rangeKm) {
    return { error: 'Reichweite zu gering für eine sinnvolle Strecke. Ausdauer erhöhen.' };
  }

  for (let attempt = 0; attempt < 80; attempt++) {
    const dep = pool[randInt(pool.length)];
    const candidates = [];
    for (const ap of pool) {
      if (ap === dep) continue;
      const d = haversineKm(dep.lat, dep.lon, ap.lat, ap.lon);
      if (d >= minDist && d <= rangeKm) candidates.push({ ap, d });
    }
    if (candidates.length) {
      const pick = candidates[randInt(candidates.length)];
      return {
        dep, arr: pick.ap, distKm: pick.d, rangeKm,
        eetHours: pick.d / cruiseKmh,
      };
    }
  }
  return { error: 'Keine passende Route gefunden — versuch es nochmal oder passe die Ausdauer an.' };
}

function displayName(a) { return a.iata ? a.iata : a.icao || '----'; }

function renderRoute(result, aircraft) {
  const box = document.getElementById('routeResult');
  box.hidden = false;

  document.getElementById('depCode').textContent = displayName(result.dep);
  document.getElementById('depIcao').textContent = result.dep.icao || '';
  document.getElementById('depName').textContent = result.dep.name;
  document.getElementById('depPlace').textContent = [result.dep.city, result.dep.country].filter(Boolean).join(', ');

  document.getElementById('arrCode').textContent = displayName(result.arr);
  document.getElementById('arrIcao').textContent = result.arr.icao || '';
  document.getElementById('arrName').textContent = result.arr.name;
  document.getElementById('arrPlace').textContent = [result.arr.city, result.arr.country].filter(Boolean).join(', ');

  document.getElementById('rAircraft').textContent = `${aircraft.name} (${CATEGORIES[aircraft.category].code})`;
  document.getElementById('rDist').textContent = `${Math.round(result.distKm)} KM / ${Math.round(result.distKm / 1.852)} NM`;
  document.getElementById('rTime').textContent = `${fmtHM(result.eetHours)} h`;
  document.getElementById('rRangeUse').textContent = `${Math.round(result.distKm / result.rangeKm * 100)} %`;

  updateGlobe(result);
}

/* ================= globe ================= */
function initGlobe() {
  globe = Globe()(document.getElementById('globeContainer'))
    .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg')
    .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')
    .atmosphereColor('#52e0d1')
    .atmosphereAltitude(0.18)
    .showGraticules(false)
    .arcsData([])
    .arcColor(() => ['#ffb300', '#52e0d1'])
    .arcDashLength(0.4)
    .arcDashGap(0.15)
    .arcDashAnimateTime(2200)
    .arcStroke(0.55)
    .arcAltitudeAutoScale(0.35)
    .pointsData([])
    .pointRadius(0.35)
    .pointAltitude(0.005)
    .pointColor('color')
    .labelsData([])
    .labelLat('lat').labelLng('lng').labelText('text')
    .labelColor('color')
    .labelDotRadius(0.28)
    .labelSize(() => sizeForAltitude(currentAltitude))
    .labelAltitude(0.012)
    .labelResolution(3)
    .onZoom(({ altitude }) => { currentAltitude = altitude; });

  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.35;
  globe.controls().enableDamping = true;

  fitGlobeSize();
  window.addEventListener('resize', fitGlobeSize);

  globe.pointOfView({ lat: 25, lng: 15, altitude: 2.4 });
  currentAltitude = 2.4;
}
function fitGlobeSize() {
  if (!globe) return;
  globe.width(window.innerWidth).height(window.innerHeight);
}
// smaller label text the further you zoom out, larger when zoomed in
function sizeForAltitude(alt) {
  const clamped = Math.min(Math.max(alt, 0.25), 3.5);
  return 0.55 + (3.5 - clamped) * 0.55;
}

function updateGlobe(result) {
  globe.controls().autoRotate = false;

  globe.arcsData([{
    startLat: result.dep.lat, startLng: result.dep.lon,
    endLat: result.arr.lat, endLng: result.arr.lon,
  }]);

  globe.pointsData([
    { lat: result.dep.lat, lng: result.dep.lon, color: '#ffb300' },
    { lat: result.arr.lat, lng: result.arr.lon, color: '#52e0d1' },
  ]);

  globe.labelsData([
    { lat: result.dep.lat, lng: result.dep.lon, text: displayName(result.dep), color: '#ffb300' },
    { lat: result.arr.lat, lng: result.arr.lon, color: '#52e0d1', text: displayName(result.arr) },
  ]);

  const midLat = (result.dep.lat + result.arr.lat) / 2;
  let midLng = (result.dep.lon + result.arr.lon) / 2;
  // handle antimeridian wraparound roughly
  if (Math.abs(result.dep.lon - result.arr.lon) > 180) midLng = midLng > 0 ? midLng - 180 : midLng + 180;

  const alt = Math.min(3.2, Math.max(0.5, result.distKm / 9000 + 0.35));
  globe.pointOfView({ lat: midLat, lng: midLng, altitude: alt }, 1400);
}

/* ================= fleet UI ================= */
function categoryOptionsHtml(selected) {
  return Object.entries(CATEGORIES).map(([key, c]) =>
    `<option value="${key}" ${key === selected ? 'selected' : ''}>${c.label} (${c.code})</option>`
  ).join('');
}

function renderFleetList() {
  const list = document.getElementById('fleetList');
  if (!fleet.length) {
    list.innerHTML = `<div class="note">Noch keine Flugzeuge angelegt.</div>`;
  } else {
    list.innerHTML = fleet.map(ac => {
      const cat = CATEGORIES[ac.category];
      return `<div class="fleetItem" data-id="${ac.id}">
        <div class="fleetItem__glyph">${cat.code}</div>
        <div class="fleetItem__body">
          <div class="fleetItem__name">${escapeHtml(ac.name)}</div>
          <div class="fleetItem__meta">${cat.label} · ${ac.cruiseKt} kt · ${ac.enduranceMin} min</div>
        </div>
        <button class="fleetItem__del" data-del="${ac.id}" aria-label="Löschen">✕</button>
      </div>`;
    }).join('');
  }
  renderAircraftSelect();
}

function renderAircraftSelect() {
  const sel = document.getElementById('aircraftSelect');
  const prev = sel.value;
  sel.innerHTML = `<option value="__random__">— RANDOM (FLEET) —</option>` +
    fleet.map(ac => `<option value="${ac.id}">${escapeHtml(ac.name)} (${CATEGORIES[ac.category].code})</option>`).join('');
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;

  const genBtn = document.getElementById('generateBtn');
  const emptyNote = document.getElementById('emptyFleetNote');
  genBtn.disabled = fleet.length === 0;
  emptyNote.hidden = fleet.length !== 0;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ================= events ================= */
function wireEvents() {
  // tabs
  document.querySelectorAll('.cdu__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cdu__tab').forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
      document.querySelectorAll('.cdu__page').forEach(p => p.classList.remove('is-active'));
      document.getElementById('page-' + tab.dataset.tab).classList.add('is-active');
    });
  });

  // mobile collapse
  const cdu = document.getElementById('cdu');
  const toggleBtn = document.getElementById('panelToggle');
  toggleBtn.addEventListener('click', () => {
    const collapsed = cdu.classList.toggle('is-collapsed');
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  });

  // category select -> prefill defaults
  const catSelect = document.getElementById('acCategory');
  catSelect.innerHTML = categoryOptionsHtml('ga_single');
  function applyCategoryDefaults() {
    const cat = CATEGORIES[catSelect.value];
    document.getElementById('acCruise').value = cat.cruiseKt;
    document.getElementById('acEndurance').value = cat.enduranceMin;
    document.getElementById('categoryHint').textContent =
      `Startet/landet auf: ${cat.types.map(t => t.replace('_airport', '')).join(', ')}` +
      (cat.minRwy ? ` · min. Piste ~${cat.minRwy} ft` : '');
  }
  catSelect.addEventListener('change', applyCategoryDefaults);
  applyCategoryDefaults();

  // add aircraft
  document.getElementById('fleetForm').addEventListener('submit', e => {
    e.preventDefault();
    const ac = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: document.getElementById('acName').value.trim() || 'Unbenannt',
      category: catSelect.value,
      cruiseKt: Number(document.getElementById('acCruise').value),
      enduranceMin: Number(document.getElementById('acEndurance').value),
    };
    fleet.push(ac);
    saveFleet();
    renderFleetList();
    e.target.reset();
    applyCategoryDefaults();
    toast('Flugzeug hinzugefügt');
  });

  // delete aircraft (delegation)
  document.getElementById('fleetList').addEventListener('click', e => {
    const id = e.target.getAttribute('data-del');
    if (!id) return;
    fleet = fleet.filter(a => a.id !== id);
    saveFleet();
    renderFleetList();
  });

  // reset fleet
  document.getElementById('resetFleetBtn').addEventListener('click', () => {
    if (confirm('Wirklich die gesamte Flotte löschen?')) {
      fleet = [];
      saveFleet();
      renderFleetList();
      toast('Flotte zurückgesetzt');
    }
  });

  // generate route
  document.getElementById('generateBtn').addEventListener('click', () => {
    if (!fleet.length) return;
    const sel = document.getElementById('aircraftSelect').value;
    const aircraft = sel === '__random__' ? fleet[randInt(fleet.length)] : fleet.find(a => a.id === sel);
    if (!aircraft) return;
    const result = generateRoute(aircraft);
    if (result.error) { toast(result.error, 3600); return; }
    lastRoute = result;
    renderRoute(result, aircraft);
  });

  // clock
  function tickClock() {
    const el = document.getElementById('clockReadout');
    const d = new Date();
    el.textContent = d.toISOString().substr(11, 8) + 'Z';
  }
  tickClock();
  setInterval(tickClock, 1000);
}

/* ================= boot ================= */
async function boot() {
  wireEvents();
  renderFleetList();
  initGlobe();
  try {
    await loadAirports();
  } catch (err) {
    toast('Flughafendaten konnten nicht geladen werden.', 4000);
    console.error(err);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
