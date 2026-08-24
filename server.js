/**
 * RANDOM ROUTE — MSFS Live Bridge
 * -------------------------------
 * Läuft auf demselben Windows-PC wie Microsoft Flight Simulator.
 * Liest Position/Höhe/Speed/Heading über SimConnect aus und schickt sie
 * per WebSocket an die RANDOM ROUTE Webapp (LIVE-Tab), die diese Bridge
 * mit "ws://localhost:2992" (Standard-Port) verbindet.
 *
 * Voraussetzungen:
 *   - Node.js (https://nodejs.org)
 *   - Microsoft Flight Simulator muss laufen und ein Flugzeug geladen sein
 *
 * Einrichtung:
 *   1. In diesem Ordner:  npm install
 *   2. MSFS starten, Flugzeug/Flug laden
 *   3. node server.js
 *   4. In der RANDOM ROUTE Webapp -> Tab "LIVE" -> "VERBINDEN"
 *      (Adresse ws://localhost:2992 ist bereits vorausgefüllt)
 *
 * Wichtig: Die Webapp muss dafür LOKAL (http://localhost:...) geöffnet sein,
 * nicht über die https://...github.io-Adresse — Browser blockieren eine
 * unverschlüsselte ws://-Verbindung von einer https-Seite aus ("Mixed
 * Content"). Am einfachsten im Projektordner: `npx serve` und dann
 * http://localhost:3000 öffnen.
 */

import { MSFS_API } from 'msfs-simconnect-api-wrapper';
import { WebSocketServer } from 'ws';

const PORT = 2992;
const UPDATE_MS = 1000;

const api = new MSFS_API();
const wss = new WebSocketServer({ port: PORT });

console.log(`[RANDOM ROUTE Bridge] WebSocket-Server läuft auf ws://localhost:${PORT}`);
console.log('[RANDOM ROUTE Bridge] Warte auf Verbindung zu MSFS ...');

wss.on('connection', () => {
  console.log('[RANDOM ROUTE Bridge] Webapp verbunden.');
});

function broadcast(payload) {
  const json = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(json);
  });
}

api.connect({
  retries: Infinity,
  retryInterval: 5,
  onConnect: () => {
    console.log('[RANDOM ROUTE Bridge] Mit MSFS verbunden. Sende Live-Daten ...');

    api.schedule(
      (data) => {
        broadcast({
          lat: data.PLANE_LATITUDE,
          lon: data.PLANE_LONGITUDE,
          altitude: data.INDICATED_ALTITUDE,
          heading: data.PLANE_HEADING_DEGREES_TRUE,
          gs: data.GROUND_VELOCITY,
          ias: data.AIRSPEED_INDICATED,
          onGround: !!data.SIM_ON_GROUND,
        });
      },
      UPDATE_MS,
      'PLANE_LATITUDE',
      'PLANE_LONGITUDE',
      'INDICATED_ALTITUDE',
      'PLANE_HEADING_DEGREES_TRUE',
      'GROUND_VELOCITY',
      'AIRSPEED_INDICATED',
      'SIM_ON_GROUND',
    );
  },
  onRetry: (retriesLeft, interval) => {
    console.log(`[RANDOM ROUTE Bridge] MSFS nicht gefunden — neuer Versuch in ${interval}s (läuft der Sim mit geladenem Flugzeug?)`);
  },
  onException: (name) => {
    console.log('[RANDOM ROUTE Bridge] SimConnect-Fehler:', name);
  },
});
