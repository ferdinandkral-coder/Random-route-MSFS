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
  narrowbody: { code: 'NB',  label: 'Narrowbody Airliner',  cruiseKt: 460, enduranceMin: 360, types: ['medium_airport', 'large_airport'],                  minRwy: 6500, requireSched: true },
  widebody:   { code: 'WB',  label: 'Widebody Airliner',    cruiseKt: 490, enduranceMin: 480, types: ['large_airport'],                                    minRwy: 8500, requireSched: true },
  helicopter: { code: 'HEL', label: 'Helikopter',           cruiseKt: 120, enduranceMin: 90,  types: ['small_airport', 'medium_airport', 'large_airport'], minRwy: 0 },
};

const FLEET_KEY = 'rr_fleet_v1';

/* ---------- MSFS 2024 Standard-Edition-Flotte (Presets) ----------
   Namen wie im Sim, Cruise-Speed (kt) und typische Ausdauer (min)
   grob nach Realdaten/Herstellerangaben, editierbar nach dem Einfügen. */
const MSFS_PRESETS = [
  { name: 'Aero Vodochody L-39 Albatros',        category: 'bizjet',     cruiseKt: 350, enduranceMin: 90 },
  { name: 'AeroElvira Optica',                   category: 'ga_single',  cruiseKt: 90,  enduranceMin: 240 },
  { name: 'Air Tractor AT-802',                  category: 'ga_single',  cruiseKt: 140, enduranceMin: 240 },
  { name: 'Airbus A310-300',                     category: 'widebody',   cruiseKt: 460, enduranceMin: 480 },
  { name: 'Airbus A320neo',                      category: 'narrowbody', cruiseKt: 450, enduranceMin: 300 },
  { name: 'Airbus A321LR',                       category: 'narrowbody', cruiseKt: 450, enduranceMin: 420 },
  { name: 'Airbus A330-300',                     category: 'widebody',   cruiseKt: 470, enduranceMin: 600 },
  { name: 'Airbus A330-743L Beluga XL',          category: 'widebody',   cruiseKt: 430, enduranceMin: 360 },
  { name: 'Airbus A400M Atlas',                  category: 'turboprop',  cruiseKt: 300, enduranceMin: 480 },
  { name: 'Airbus H125',                         category: 'helicopter', cruiseKt: 120, enduranceMin: 150 },
  { name: 'Airship Industries Skyship 600',      category: 'helicopter', cruiseKt: 40,  enduranceMin: 300 },
  { name: 'Archer Midnight (eVTOL)',             category: 'helicopter', cruiseKt: 100, enduranceMin: 60 },
  { name: 'Aviat Pitts Special S1S',             category: 'ga_single',  cruiseKt: 130, enduranceMin: 120 },
  { name: 'Beechcraft Bonanza G36',              category: 'ga_single',  cruiseKt: 160, enduranceMin: 300 },
  { name: 'Beechcraft King Air 350i',            category: 'turboprop',  cruiseKt: 300, enduranceMin: 300 },
  { name: 'Bell 407',                            category: 'helicopter', cruiseKt: 130, enduranceMin: 180 },
  { name: 'CGS Hawk Arrow II',                   category: 'ultralight', cruiseKt: 55,  enduranceMin: 120 },
  { name: 'Cessna 152',                          category: 'ga_single',  cruiseKt: 100, enduranceMin: 240 },
  { name: 'Cessna 172 Skyhawk G1000',            category: 'ga_single',  cruiseKt: 120, enduranceMin: 240 },
  { name: 'Cessna 208B Grand Caravan EX',        category: 'turboprop',  cruiseKt: 180, enduranceMin: 300 },
  { name: 'Cessna 400 Corvalis TT',              category: 'ga_single',  cruiseKt: 235, enduranceMin: 300 },
  { name: 'Cessna Citation CJ4',                 category: 'bizjet',     cruiseKt: 450, enduranceMin: 300 },
  { name: 'Cirrus Vision SF50',                  category: 'bizjet',     cruiseKt: 300, enduranceMin: 240 },
  { name: 'CubCrafters NXCub',                   category: 'ultralight', cruiseKt: 100, enduranceMin: 240 },
  { name: 'CubCrafters XCub',                    category: 'ultralight', cruiseKt: 120, enduranceMin: 240 },
  { name: 'Curtiss JN-4 Jenny',                  category: 'ga_single',  cruiseKt: 60,  enduranceMin: 120 },
  { name: 'DG Aviation DG-1001E',                category: 'glider',     cruiseKt: 70,  enduranceMin: 180 },
  { name: 'DG Aviation LS8-18',                  category: 'glider',     cruiseKt: 65,  enduranceMin: 240 },
  { name: 'Daher TBM 930',                       category: 'turboprop',  cruiseKt: 320, enduranceMin: 300 },
  { name: 'De Havilland Canada CL-415',          category: 'turboprop',  cruiseKt: 180, enduranceMin: 240 },
  { name: 'DHC-2 Beaver',                        category: 'ga_single',  cruiseKt: 100, enduranceMin: 300 },
  { name: 'DHC-6 Twin Otter',                    category: 'turboprop',  cruiseKt: 170, enduranceMin: 300 },
  { name: 'Diamond DA40 NG',                     category: 'ga_single',  cruiseKt: 140, enduranceMin: 300 },
  { name: 'Diamond DA62',                        category: 'ga_twin',    cruiseKt: 190, enduranceMin: 360 },
  { name: 'Douglas DC-3',                        category: 'turboprop',  cruiseKt: 160, enduranceMin: 360 },
  { name: 'Draco X',                             category: 'ga_single',  cruiseKt: 130, enduranceMin: 180 },
  { name: 'EXTRA 330LT',                         category: 'ga_single',  cruiseKt: 140, enduranceMin: 90 },
  { name: 'Erickson S-64F Aircrane',             category: 'helicopter', cruiseKt: 100, enduranceMin: 150 },
  { name: 'Fairchild A-10 Thunderbolt II',       category: 'bizjet',     cruiseKt: 300, enduranceMin: 120 },
  { name: 'Flight Design CTSL',                  category: 'ultralight', cruiseKt: 110, enduranceMin: 300 },
  { name: 'Hot Air Balloon',                     category: 'helicopter', cruiseKt: 10,  enduranceMin: 90 },
  { name: 'Grumman G-21A Goose',                 category: 'ga_twin',    cruiseKt: 130, enduranceMin: 300 },
  { name: 'Guimbal Cabri G2',                    category: 'helicopter', cruiseKt: 100, enduranceMin: 150 },
  { name: 'Heart Aerospace ES-30',               category: 'turboprop',  cruiseKt: 250, enduranceMin: 120 },
  { name: 'Hughes H-4 Hercules "Spruce Goose"',  category: 'widebody',   cruiseKt: 130, enduranceMin: 180 },
  { name: 'ICON A5',                             category: 'ultralight', cruiseKt: 95,  enduranceMin: 180 },
  { name: 'JMB Aircraft VL-3',                   category: 'ultralight', cruiseKt: 140, enduranceMin: 240 },
  { name: 'Jetson One (eVTOL)',                  category: 'helicopter', cruiseKt: 60,  enduranceMin: 20 },
  { name: 'Joby S4 (eVTOL)',                     category: 'helicopter', cruiseKt: 150, enduranceMin: 60 },
  { name: 'MX Aircraft MXS-R',                   category: 'ga_single',  cruiseKt: 180, enduranceMin: 90 },
  { name: 'Magni Gyro M-24 Orion',               category: 'helicopter', cruiseKt: 90,  enduranceMin: 180 },
  { name: 'North American P-51 Mustang',         category: 'ga_single',  cruiseKt: 300, enduranceMin: 180 },
  { name: 'North American T-6 Texan',            category: 'ga_single',  cruiseKt: 145, enduranceMin: 180 },
  { name: 'Pilatus PC-12 NGX',                   category: 'turboprop',  cruiseKt: 280, enduranceMin: 360 },
  { name: 'Pilatus PC-6 B2',                     category: 'ga_single',  cruiseKt: 130, enduranceMin: 300 },
  { name: 'Powrachute Sky Rascal',                category: 'ultralight', cruiseKt: 25,  enduranceMin: 120 },
  { name: 'Robin CAP 10',                        category: 'ga_single',  cruiseKt: 130, enduranceMin: 150 },
  { name: 'Robin DR400-100 Cadet',               category: 'ga_single',  cruiseKt: 110, enduranceMin: 240 },
  { name: 'Robinson R66',                        category: 'helicopter', cruiseKt: 120, enduranceMin: 150 },
  { name: 'Ryan NYP "Spirit of St. Louis"',      category: 'ga_single',  cruiseKt: 100, enduranceMin: 600 },
  { name: 'Stemme S12G',                         category: 'glider',     cruiseKt: 110, enduranceMin: 300 },
  { name: 'Boeing 737 MAX 8',                    category: 'narrowbody', cruiseKt: 450, enduranceMin: 360 },
  { name: 'Boeing 747-8I',                       category: 'widebody',   cruiseKt: 490, enduranceMin: 600 },
  { name: 'Boeing F/A-18E Super Hornet',         category: 'bizjet',     cruiseKt: 450, enduranceMin: 90 },
  { name: 'Volocopter VoloCity (eVTOL)',         category: 'helicopter', cruiseKt: 60,  enduranceMin: 30 },
  { name: 'Wright Flyer',                        category: 'ultralight', cruiseKt: 25,  enduranceMin: 5 },
  { name: 'Zivko Edge 540',                      category: 'ga_single',  cruiseKt: 170, enduranceMin: 60 },
  { name: 'Zlin Aviation Savage Cub',            category: 'ultralight', cruiseKt: 90,  enduranceMin: 240 },
];

/* ---------- state ---------- */
let fleet = loadFleet();
seedDefaultFleet();
let airports = [];
let airportPool = {};   // category -> filtered airport array
let globe = null;
let lastRoute = null;
let liveSocket = null;
let liveAircraft = null; // { lat, lon, alt, hdg, gs, ias, onGround }
let liveFirstFix = true;

/* ================= utils ================= */
function loadFleet() {
  try { return JSON.parse(localStorage.getItem(FLEET_KEY)) || []; }
  catch { return []; }
}
function saveFleet() { localStorage.setItem(FLEET_KEY, JSON.stringify(fleet)); }

// Ist die Flotte leer (erster Start ODER weil sie zwischenzeitlich komplett
// geleert wurde), wird automatisch die komplette MSFS 2024 Standard-Edition
// eingefügt.
function seedDefaultFleet() {
  if (fleet.length > 0) return;
  fleet = MSFS_PRESETS.map(p => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name: p.name,
    category: p.category,
    cruiseKt: p.cruiseKt,
    enduranceMin: p.enduranceMin,
  }));
  saveFleet();
}

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
      cat.types.includes(a.type) &&
      (a.rwy_ft === 0 || a.rwy_ft >= cat.minRwy) &&
      (!cat.requireSched || a.sched)
    );
  }
}

/* ================= route generation ================= */
function generateRoute(aircraft, requestedMin) {
  const cat = CATEGORIES[aircraft.category];
  const pool = airportPool[aircraft.category] || [];
  if (pool.length < 2) return { error: 'Für diese Kategorie sind zu wenige Flughäfen bekannt.' };

  // gewünschte Flugzeit darf die tatsächliche Ausdauer des Flugzeugs nie überschreiten
  const enduranceMin = Math.min(Math.max(5, requestedMin || aircraft.enduranceMin), aircraft.enduranceMin);

  const cruiseKmh = aircraft.cruiseKt * 1.852;
  const rangeKm = cruiseKmh * (enduranceMin / 60) * 0.9; // 10% reserve
  const minDist = Math.max(50, rangeKm * 0.12);

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
        enduranceUsedMin: enduranceMin,
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
  document.getElementById('rMaxTime').textContent = `${result.enduranceUsedMin} min`;

  updateGlobe(result);
}

/* ================= globe ================= */

// Kompakte Auswahl an Grossstaedten fuer die Globus-Beschriftung.
const CITY_LABELS = [
  { name: 'London', lat: 51.507, lng: -0.128 }, { name: 'Paris', lat: 48.857, lng: 2.352 },
  { name: 'Berlin', lat: 52.52, lng: 13.405 }, { name: 'Wien', lat: 48.208, lng: 16.373 },
  { name: 'Zürich', lat: 47.377, lng: 8.541 }, { name: 'Madrid', lat: 40.417, lng: -3.703 },
  { name: 'Rom', lat: 41.903, lng: 12.496 }, { name: 'Amsterdam', lat: 52.367, lng: 4.904 },
  { name: 'Brüssel', lat: 50.85, lng: 4.352 }, { name: 'Lissabon', lat: 38.722, lng: -9.139 },
  { name: 'Dublin', lat: 53.35, lng: -6.26 }, { name: 'Kopenhagen', lat: 55.676, lng: 12.568 },
  { name: 'Stockholm', lat: 59.329, lng: 18.069 }, { name: 'Oslo', lat: 59.914, lng: 10.752 },
  { name: 'Helsinki', lat: 60.169, lng: 24.938 }, { name: 'Warschau', lat: 52.23, lng: 21.011 },
  { name: 'Prag', lat: 50.088, lng: 14.421 }, { name: 'Budapest', lat: 47.498, lng: 19.04 },
  { name: 'Athen', lat: 37.984, lng: 23.728 }, { name: 'Istanbul', lat: 41.008, lng: 28.978 },
  { name: 'Moskau', lat: 55.756, lng: 37.617 }, { name: 'Kiew', lat: 50.45, lng: 30.523 },
  { name: 'New York', lat: 40.713, lng: -74.006 }, { name: 'Los Angeles', lat: 34.052, lng: -118.244 },
  { name: 'Chicago', lat: 41.878, lng: -87.63 }, { name: 'Toronto', lat: 43.651, lng: -79.383 },
  { name: 'Vancouver', lat: 49.283, lng: -123.121 }, { name: 'Mexiko-Stadt', lat: 19.433, lng: -99.133 },
  { name: 'Miami', lat: 25.762, lng: -80.191 }, { name: 'San Francisco', lat: 37.774, lng: -122.419 },
  { name: 'São Paulo', lat: -23.551, lng: -46.633 }, { name: 'Rio de Janeiro', lat: -22.906, lng: -43.172 },
  { name: 'Buenos Aires', lat: -34.603, lng: -58.381 }, { name: 'Santiago', lat: -33.447, lng: -70.673 },
  { name: 'Lima', lat: -12.046, lng: -77.043 }, { name: 'Bogotá', lat: 4.711, lng: -74.072 },
  { name: 'Kairo', lat: 30.044, lng: 31.236 }, { name: 'Lagos', lat: 6.524, lng: 3.379 },
  { name: 'Nairobi', lat: -1.292, lng: 36.822 }, { name: 'Johannesburg', lat: -26.204, lng: 28.047 },
  { name: 'Casablanca', lat: 33.573, lng: -7.589 }, { name: 'Addis Abeba', lat: 9.03, lng: 38.74 },
  { name: 'Tokio', lat: 35.676, lng: 139.65 }, { name: 'Peking', lat: 39.904, lng: 116.407 },
  { name: 'Shanghai', lat: 31.23, lng: 121.474 }, { name: 'Seoul', lat: 37.566, lng: 126.978 },
  { name: 'Bangkok', lat: 13.756, lng: 100.502 }, { name: 'Singapur', lat: 1.352, lng: 103.82 },
  { name: 'Jakarta', lat: -6.208, lng: 106.845 }, { name: 'Mumbai', lat: 19.076, lng: 72.878 },
  { name: 'Delhi', lat: 28.704, lng: 77.102 }, { name: 'Dubai', lat: 25.205, lng: 55.271 },
  { name: 'Riad', lat: 24.713, lng: 46.675 }, { name: 'Tel Aviv', lat: 32.085, lng: 34.782 },
  { name: 'Hongkong', lat: 22.319, lng: 114.169 }, { name: 'Manila', lat: 14.599, lng: 120.984 },
  { name: 'Kuala Lumpur', lat: 3.139, lng: 101.687 }, { name: 'Karachi', lat: 24.861, lng: 67.001 },
  { name: 'Sydney', lat: -33.868, lng: 151.209 }, { name: 'Melbourne', lat: -37.814, lng: 144.963 },
  { name: 'Auckland', lat: -36.848, lng: 174.763 },
];

let countriesGeo = null;

// Grober Schwerpunkt eines Landes fuer die Beschriftungsposition -- nutzt
// den groessten Ring bei Multi-Polygonen (z.B. Inselstaaten) als Naeherung,
// exakte geometrische Genauigkeit ist fuer eine Atlas-Beschriftung nicht noetig.
function countryLabelPosition(feature) {
  const geom = feature.geometry;
  let ring;
  if (geom.type === 'Polygon') {
    ring = geom.coordinates[0];
  } else {
    ring = geom.coordinates.reduce((longest, poly) =>
      poly[0].length > longest.length ? poly[0] : longest, geom.coordinates[0][0]);
  }
  let sumLat = 0, sumLng = 0;
  ring.forEach(([lng, lat]) => { sumLat += lat; sumLng += lng; });
  return { lat: sumLat / ring.length, lng: sumLng / ring.length };
}

async function loadCountries() {
  const res = await fetch('countries.json');
  countriesGeo = await res.json();
}

function initGlobe() {
  globe = Globe()(document.getElementById('globeContainer'))
    .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')
    .atmosphereColor('#52e0d1')
    .atmosphereAltitude(0.18)
    .showGraticules(false)
    .polygonsData([])
    .polygonGeoJsonGeometry('geometry')
    .polygonCapColor(() => 'rgba(0,0,0,0)')
    .polygonSideColor(() => 'rgba(0,0,0,0)')
    .polygonStrokeColor(() => 'rgba(255,255,255,0.45)')
    .polygonAltitude(0.001)
    .labelsData([])
    .labelLat('lat').labelLng('lng').labelText('name')
    .labelSize((d) => (d.isCountry ? 0.55 : 0.38))
    .labelColor((d) => (d.isCountry ? 'rgba(255,255,255,0.55)' : 'rgba(82,224,209,0.85)'))
    .labelDotRadius((d) => (d.isCountry ? 0 : 0.25))
    .labelResolution(2)
    .labelAltitude(0.006)
    .labelIncludeDot((d) => !d.isCountry)
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
    .htmlElementsData([])
    .htmlLat('lat').htmlLng('lng')
    .htmlElement(d => d.el);

  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.35;
  globe.controls().enableDamping = true;

  fitGlobeSize();
  window.addEventListener('resize', fitGlobeSize);

  globe.pointOfView({ lat: 25, lng: 15, altitude: 2.4 });

  const cityLabels = CITY_LABELS.map(c => ({ ...c, isCountry: false }));
  globe.labelsData(cityLabels);

  loadCountries().then(() => {
    if (!countriesGeo) return;
    globe.polygonsData(countriesGeo.features);
    const countryLabels = countriesGeo.features.map(f => ({
      ...countryLabelPosition(f),
      name: f.properties.name,
      isCountry: true,
    }));
    globe.labelsData([...cityLabels, ...countryLabels]);
  }).catch(err => console.error('Ländergrenzen konnten nicht geladen werden:', err));
}
function fitGlobeSize() {
  if (!globe) return;
  globe.width(window.innerWidth).height(window.innerHeight);
}

// baut ein HTML-Label mit fester, zoom-unabhängiger Pixelgröße. offsetY
// trennt Start-/Ziel-Beschriftung optisch, auch wenn beide Flughäfen nahe
// beieinander liegen (verhindert das Überlappungsproblem endgültig).
function makeAirportLabel(text, variantClass, offsetY) {
  const wrap = document.createElement('div');
  wrap.style.pointerEvents = 'none';
  const inner = document.createElement('div');
  inner.className = 'globeLabel ' + variantClass;
  inner.style.transform = `translate(-50%, ${offsetY})`;
  inner.textContent = text;
  wrap.appendChild(inner);
  return wrap;
}

function updateGlobe(result) {
  globe.controls().autoRotate = false;
  refreshGlobeLayers();

  const midLat = (result.dep.lat + result.arr.lat) / 2;
  let midLng = (result.dep.lon + result.arr.lon) / 2;
  // handle antimeridian wraparound roughly
  if (Math.abs(result.dep.lon - result.arr.lon) > 180) midLng = midLng > 0 ? midLng - 180 : midLng + 180;

  const alt = Math.min(3.2, Math.max(0.35, result.distKm / 8000 + 0.28));
  globe.pointOfView({ lat: midLat, lng: midLng, altitude: alt }, 1400);
}

// zeichnet Route (falls vorhanden) und Live-Flugzeug (falls verbunden)
// gemeinsam neu, ohne sich gegenseitig zu überschreiben
function refreshGlobeLayers() {
  if (!globe) return;

  const arcs = lastRoute ? [{
    startLat: lastRoute.dep.lat, startLng: lastRoute.dep.lon,
    endLat: lastRoute.arr.lat, endLng: lastRoute.arr.lon,
  }] : [];

  const points = [];
  const labels = [];

  if (lastRoute) {
    points.push({ lat: lastRoute.dep.lat, lng: lastRoute.dep.lon, color: '#ffb300' });
    points.push({ lat: lastRoute.arr.lat, lng: lastRoute.arr.lon, color: '#52e0d1' });
    labels.push({ lat: lastRoute.dep.lat, lng: lastRoute.dep.lon, el: makeAirportLabel(displayName(lastRoute.dep), 'globeLabel--dep', '-170%') });
    labels.push({ lat: lastRoute.arr.lat, lng: lastRoute.arr.lon, el: makeAirportLabel(displayName(lastRoute.arr), '', '60%') });
  }

  if (liveAircraft) {
    points.push({ lat: liveAircraft.lat, lng: liveAircraft.lon, color: '#eef3f6' });
    labels.push({ lat: liveAircraft.lat, lng: liveAircraft.lon, el: makeAirportLabel('✈ LIVE', 'globeLabel--live', '-170%') });
  }

  globe.arcsData(arcs);
  globe.pointsData(points);
  globe.htmlElementsData(labels);
}

/* ================= MSFS live tracking ================= */
function connectLive() {
  const url = document.getElementById('liveUrl').value.trim();
  const statusEl = document.getElementById('liveStatus');
  const btn = document.getElementById('liveConnectBtn');
  if (!url) return;

  if (location.protocol === 'https:' && url.startsWith('ws://')) {
    statusEl.textContent = 'Diese Seite läuft über HTTPS — eine unverschlüsselte ws://-Verbindung wird vom Browser blockiert. Seite lokal öffnen (siehe INFO).';
    return;
  }

  try { liveSocket = new WebSocket(url); }
  catch (err) { statusEl.textContent = 'Ungültige Adresse.'; return; }

  statusEl.textContent = 'Verbinde …';
  btn.disabled = true;

  liveSocket.onopen = () => {
    statusEl.textContent = 'Verbunden — warte auf Daten von MSFS …';
    btn.textContent = '⟲ TRENNEN';
    btn.disabled = false;
    liveFirstFix = true;
  };
  liveSocket.onmessage = (ev) => {
    let data;
    try { data = JSON.parse(ev.data); } catch { return; }
    if (typeof data.lat !== 'number' || typeof data.lon !== 'number') return;
    liveAircraft = data;
    renderLiveData(data);
    refreshGlobeLayers();
    if (liveFirstFix) {
      globe.pointOfView({ lat: data.lat, lng: data.lon, altitude: 0.6 }, 1200);
      liveFirstFix = false;
    }
  };
  liveSocket.onerror = () => { statusEl.textContent = 'Verbindungsfehler — läuft die Bridge (start.py)?'; };
  liveSocket.onclose = () => {
    statusEl.textContent = 'Nicht verbunden.';
    btn.textContent = '⟲ VERBINDEN';
    btn.disabled = false;
    liveSocket = null;
    liveAircraft = null;
    document.getElementById('liveData').hidden = true;
    refreshGlobeLayers();
  };
}
function disconnectLive() {
  if (liveSocket) liveSocket.close();
}
function renderLiveData(d) {
  document.getElementById('liveData').hidden = false;
  document.getElementById('liveLatLon').textContent = `${d.lat.toFixed(3)}, ${d.lon.toFixed(3)}`;
  document.getElementById('liveAlt').textContent = d.altitude != null ? `${Math.round(d.altitude)} ft` : '—';
  document.getElementById('liveHdg').textContent = d.heading != null ? `${Math.round(d.heading)}°` : '—';
  document.getElementById('liveGs').textContent = d.gs != null ? `${Math.round(d.gs)} kt` : '—';
  document.getElementById('liveIas').textContent = d.ias != null ? `${Math.round(d.ias)} kt` : '—';
  document.getElementById('liveGround').textContent = d.onGround ? 'AM BODEN' : 'IN DER LUFT';
}

// Andockstelle fuer die Desktop-App (desktop-app/app.py): laeuft die Seite
// dort in einem pywebview-Fenster, ruft Python direkt window.__liveUpdate()
// mit den MSFS-Daten auf -- kein WebSocket noetig, kein Mixed-Content-Thema.
window.__liveUpdate = function (data) {
  if (typeof data.lat !== 'number' || typeof data.lon !== 'number') return;
  liveAircraft = data;
  renderLiveData(data);
  refreshGlobeLayers();
  if (liveFirstFix && globe) {
    globe.pointOfView({ lat: data.lat, lng: data.lon, altitude: 0.6 }, 1200);
    liveFirstFix = false;
  }
};

function initDesktopAppMode() {
  if (!window.pywebview) return false;
  const statusEl = document.getElementById('liveStatus');
  const btn = document.getElementById('liveConnectBtn');
  const urlField = document.getElementById('liveUrl');
  statusEl.textContent = 'Desktop-App erkannt — Live-Daten kommen automatisch, sobald MSFS läuft.';
  btn.hidden = true;
  urlField.closest('.field').hidden = true;
  return true;
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

function getSelectedCategoryFilter() {
  const el = document.getElementById('categoryFilter');
  return el ? el.value : '';
}
function fleetForCategoryFilter() {
  const catFilter = getSelectedCategoryFilter();
  return catFilter ? fleet.filter(a => a.category === catFilter) : fleet;
}

function renderCategoryFilter() {
  const sel = document.getElementById('categoryFilter');
  const prev = sel.value;
  sel.innerHTML = `<option value="">— alle Kategorien —</option>` +
    Object.entries(CATEGORIES).map(([key, c]) => `<option value="${key}">${c.label} (${c.code})</option>`).join('');
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
}

function renderAircraftSelect() {
  const sel = document.getElementById('aircraftSelect');
  const prev = sel.value;
  const scoped = fleetForCategoryFilter();
  const catFilter = getSelectedCategoryFilter();
  const randomLabel = catFilter
    ? `— RANDOM (${CATEGORIES[catFilter].label}) —`
    : `— RANDOM (FLEET) —`;
  sel.innerHTML = `<option value="__random__">${randomLabel}</option>` +
    scoped.map(ac => `<option value="${ac.id}">${escapeHtml(ac.name)} (${CATEGORIES[ac.category].code})</option>`).join('');
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;

  const genBtn = document.getElementById('generateBtn');
  const emptyNote = document.getElementById('emptyFleetNote');
  genBtn.disabled = scoped.length === 0;
  emptyNote.hidden = scoped.length !== 0;
  emptyNote.innerHTML = catFilter
    ? `Keine Flugzeuge dieser Kategorie in der Flotte. Wechsle zu <b>FLEET</b> und leg eines an, oder wähle „alle Kategorien“.`
    : `Keine Flugzeuge in der Flotte. Wechsle zu <b>FLEET</b> und leg eines an.`;

  syncDurationField();
}

// hält das "gewünschte Flugzeit"-Feld im Einklang mit der max. Ausdauer
// des aktuell gewählten Flugzeugs (bzw. der ganzen Flotte bei "Random")
function syncDurationField() {
  const durInput = document.getElementById('durationInput');
  const hint = document.getElementById('durationHint');
  if (!durInput) return;
  const sel = document.getElementById('aircraftSelect').value;

  if (sel === '__random__') {
    const scoped = fleetForCategoryFilter();
    const maxEndurance = scoped.length ? Math.max(...scoped.map(a => a.enduranceMin)) : 120;
    durInput.max = maxEndurance;
    if (!durInput.value || Number(durInput.value) > maxEndurance) durInput.value = maxEndurance;
    hint.textContent = 'Bei zufälligem Flugzeug wird die Zeit automatisch auf dessen max. Ausdauer begrenzt.';
  } else {
    const ac = fleet.find(a => a.id === sel);
    if (!ac) return;
    durInput.max = ac.enduranceMin;
    if (!durInput.value || Number(durInput.value) > ac.enduranceMin) durInput.value = ac.enduranceMin;
    hint.textContent = `Max. Ausdauer von ${ac.name}: ${ac.enduranceMin} min.`;
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ================= events ================= */
function wireEvents() {
  renderCategoryFilter();

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

  // MSFS 2024 Standardflotte als Presets
  const presetSelect = document.getElementById('msfsPreset');
  presetSelect.innerHTML = `<option value="">— eigenes Flugzeug —</option>` +
    MSFS_PRESETS.map((p, i) => `<option value="${i}">${escapeHtml(p.name)}</option>`).join('');
  presetSelect.addEventListener('change', () => {
    if (presetSelect.value === '') return;
    const p = MSFS_PRESETS[Number(presetSelect.value)];
    document.getElementById('acName').value = p.name;
    catSelect.value = p.category;
    document.getElementById('acCruise').value = p.cruiseKt;
    document.getElementById('acEndurance').value = p.enduranceMin;
    const cat = CATEGORIES[p.category];
    document.getElementById('categoryHint').textContent =
      `Startet/landet auf: ${cat.types.map(t => t.replace('_airport', '')).join(', ')}` +
      (cat.minRwy ? ` · min. Piste ~${cat.minRwy} ft` : '');
  });

  document.getElementById('aircraftSelect').addEventListener('change', syncDurationField);
  document.getElementById('categoryFilter').addEventListener('change', () => {
    document.getElementById('aircraftSelect').value = '__random__';
    renderAircraftSelect();
  });

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
    presetSelect.value = '';
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
    const scoped = fleetForCategoryFilter();
    if (!scoped.length) return;
    const sel = document.getElementById('aircraftSelect').value;
    const aircraft = sel === '__random__' ? scoped[randInt(scoped.length)] : scoped.find(a => a.id === sel);
    if (!aircraft) return;
    const requestedMin = Number(document.getElementById('durationInput').value) || aircraft.enduranceMin;
    const result = generateRoute(aircraft, requestedMin);
    if (result.error) { toast(result.error, 3600); return; }
    lastRoute = result;
    renderRoute(result, aircraft);
  });

  document.getElementById('liveConnectBtn').addEventListener('click', () => {
    if (liveSocket) disconnectLive(); else connectLive();
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

  // pywebview meldet sich manchmal erst kurz nach dem Laden -> beides pruefen
  if (!initDesktopAppMode()) {
    window.addEventListener('pywebviewready', initDesktopAppMode);
  }

  if (!window.pywebview && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
}

boot();
