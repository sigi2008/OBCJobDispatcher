# Neuland – ein gemütliches Aufbau-Abenteuer (2D)

Du strandest auf einer riesigen, friedlichen Insel. Überall stehen verlassene Gebäude:
eine Hütte, eine Werkstatt, Windmühle, Gewächshaus, Garage, Leuchtturm, ein gestrandetes
Schiff und ein Ballonhangar. Sammle Material, stelle Werkzeug her, bau alles wieder auf,
finde Überlebende und freunde dich mit Tieren an. Kein Kampf, kein Stress, nur Aufbauen.

## Starten

`index.html` im Browser öffnen (Doppelklick genügt). Du brauchst keine Installation und
keinen Server. Der Spielstand wird automatisch im Browser gespeichert.

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | laufen / fahren |
| E oder Leertaste (halten), Maus gedrückt | sammeln, abbauen, reden, benutzen |
| C | Herstellen (Werkzeuge, Bretter, Seil, Fahrrad …) |
| B | Bau-Modus (Wege, Stege, Zäune, Lagerfeuer, Beete …), Rechtsklick baut wieder ab |
| M | Karte |
| Mausrad, + / − | Zoom |
| Esc | Fenster schließen / Menü |

Am Handy oder Tablet steuerst du so: Mit dem Daumen ziehen zum Laufen, ✋ zum Sammeln und Benutzen,
im Bau-Modus aufs Feld tippen.

## Spielablauf

1. **Äste, Kiesel und Gras** sammeln, daraus **Steinaxt** und **Spitzhacke** herstellen.
2. Die **verlassene Hütte** reparieren: Sie wird zu deiner Basis mit Lager und Bett.
3. **Überlebende** an Lagerfeuern finden (gelbes „!“). Erfülle ihre Bitte, dann ziehen sie ein
   und liefern dir jede Minute Rohstoffe ins Lager.
4. **Tiere** (Hasen, Rehe, Füchse, Enten, Schafe, Igel) dreimal mit Beeren füttern: Danach folgen
   sie dir als Freunde.
5. Die **Werkstatt** schaltet Eisen, Eisenwerkzeuge und das **Fahrrad** frei.
6. **Schiff** wird zum Segelboot, die **Garage** gibt dir einen Motorroller und der **Hangar** einen
   Heißluftballon. Der **Leuchtturm** deckt die ganze Karte auf.

Jede neue Welt wird zufällig erzeugt: eine 512×512-Felder große Insel mit Wiesen, Wäldern, Stränden,
Bergen, Schnee und kleinen Inseln. Tag und Nacht wechseln sich ab, nachts leuchten Lagerfeuer,
Laternen und Fenster.

## Technik

- Reines HTML5-Canvas und JavaScript ohne Frameworks und ohne Build-Schritt.
- Alle Grafiken sind im Cartoon-Stil direkt im Code gezeichnet (`js/art.js`). Du brauchst keine
  externen Bilddateien und musst keine Lizenzen beachten.
- Die Musik wird live und generativ mit der Web-Audio-API erzeugt (`js/audio.js`). Es sind sanfte
  Akkorde, Kalimba-Melodien und tagsüber Vogelgezwitscher.

| Datei | Inhalt |
|---|---|
| `js/data.js` | Gegenstände, Rezepte, Bauteile, Ruinen, Überlebende, Tiere |
| `js/world.js` | Inselgenerierung, Biome, Platzierung, Terrain-Rendering |
| `js/game.js` | Spiellogik, Kollision, Sammeln, Bauen, Speichern |
| `js/render.js` | Kamera, Tiefensortierung, Licht und Nacht, Minikarte |
| `js/ui.js` | Menüs, Dialoge, Ziele |
| `js/main.js` | Eingabe (Tastatur, Maus, Touch) und Hauptschleife |
