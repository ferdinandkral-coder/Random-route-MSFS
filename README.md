# RANDOM ROUTE — MSFS Live Bridge

Streamt deine aktuelle Position/Höhe/Speed/Heading aus Microsoft Flight
Simulator live an die RANDOM ROUTE Webapp (Tab **LIVE**).

## Einrichtung

1. Node.js installieren, falls noch nicht vorhanden: https://nodejs.org
2. In diesem Ordner (`msfs-bridge/`) ein Terminal öffnen und ausführen:
   ```
   npm install
   ```
3. Microsoft Flight Simulator starten und ein Flugzeug/einen Flug laden.
4. Bridge starten:
   ```
   node server.js
   ```
   Du solltest sehen: `Mit MSFS verbunden. Sende Live-Daten ...`
5. Die RANDOM ROUTE Webapp öffnen → Tab **LIVE** → **VERBINDEN** (die
   Adresse `ws://localhost:2992` ist schon vorausgefüllt).

## Wichtig: HTTPS/Mixed-Content

Die über GitHub Pages gehostete Webapp läuft über **HTTPS**. Browser
blockieren aus Sicherheitsgründen eine unverschlüsselte `ws://`-Verbindung
von einer HTTPS-Seite aus ("Mixed Content"). Für Live-Tracking musst du die
Webapp deshalb **lokal** öffnen statt über die `github.io`-Adresse, z. B.:

```
npx serve ..
```
(im übergeordneten Projektordner ausgeführt) und dann
`http://localhost:3000` im Browser öffnen — von dort aus funktioniert die
Verbindung zu `ws://localhost:2992` ohne Einschränkung.

Alternativ reicht auch jeder andere lokale Webserver (z. B.
`python -m http.server` im Projektordner).

## Fehlersuche

- **„MSFS nicht gefunden"** in der Konsole: Sim läuft nicht, oder es ist
  noch kein Flugzeug geladen (Hauptmenü reicht nicht).
- **„Verbindungsfehler"** in der Webapp: Bridge läuft nicht oder ein
  anderer Port wird benutzt — Adresse im LIVE-Tab anpassen.
- Standard-Port ist `2992`, änderbar über die Konstante `PORT` in
  `server.js`.
