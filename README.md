# RANDOM ROUTE — MSFS Live Bridge (Python)

Streamt deine aktuelle Position/Höhe/Speed/Heading aus Microsoft Flight
Simulator live an die RANDOM ROUTE Webapp (Tab **LIVE**).

## Einrichtung

1. Python installieren, falls noch nicht vorhanden: https://python.org
   (beim Installieren den Haken bei **"Add python.exe to PATH"** setzen).
2. Microsoft Flight Simulator starten und ein Flugzeug/einen Flug laden.
3. **`start.py`** doppelklicken (oder Rechtsklick → „Öffnen mit → Python").
   Installiert beim ersten Mal automatisch die nötigen Pakete
   (`Python-SimConnect`, `websockets`) und startet danach die Bridge.
4. Du solltest sehen:
   ```
   [Bridge] WebSocket-Server laeuft auf ws://localhost:2992
   [Bridge] Verbunden mit MSFS. Sende Live-Daten ...
   ```
5. Die RANDOM ROUTE Webapp öffnen → Tab **LIVE** → **VERBINDEN** (Adresse
   `ws://localhost:2992` ist schon vorausgefüllt).

Alternativ manuell in einem Terminal in diesem Ordner:
```
pip install -r requirements.txt
python server.py
```

## Wichtig: HTTPS/Mixed-Content

Die über GitHub Pages gehostete Webapp läuft über **HTTPS**. Browser
blockieren aus Sicherheitsgründen eine unverschlüsselte `ws://`-Verbindung
von einer HTTPS-Seite aus ("Mixed Content"). Für Live-Tracking musst du die
Webapp deshalb **lokal** öffnen statt über die `github.io`-Adresse, z. B.
mit einem einfachen lokalen Webserver im Projektordner:
```
python -m http.server 3000
```
und dann `http://localhost:3000` im Browser öffnen — von dort aus
funktioniert die Verbindung zu `ws://localhost:2992` ohne Einschränkung.

## Automatisch bei Windows-Start ausführen

1. `Win + R` drücken, `shell:startup` eintippen, Enter.
2. Eine Verknüpfung zu `start.py` in diesem Ordner ablegen (Rechtsklick auf
   `start.py` → **Senden an → Desktop (Verknüpfung erstellen)**, die
   Verknüpfung dann in den `shell:startup`-Ordner verschieben).

Die Bridge versucht in einer Schleife alle 5 Sekunden, sich mit MSFS zu
verbinden — Startreihenfolge ist also egal.

## Fehlersuche

- **„MSFS nicht gefunden"**: Sim läuft nicht, oder es ist noch kein
  Flugzeug geladen (Hauptmenü reicht nicht).
- **„Verbindungsfehler"** in der Webapp: Bridge läuft nicht, oder ein
  anderer Port wird benutzt — Adresse im LIVE-Tab anpassen.
- Standard-Port ist `2992`, änderbar über die Konstante `PORT` in
  `server.py`.
