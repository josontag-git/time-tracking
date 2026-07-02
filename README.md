# Zeiterfassung

Einfache Progressive Web App zum Erfassen von Arbeitszeiten. Läuft auf dem iPhone (Home-Bildschirm) und schreibt jeden Eintrag in ein Google Sheet.

## Nutzung auf dem iPhone

1. Seite in Safari öffnen (GitHub-Pages-URL, siehe unten).
2. Teilen-Button → "Zum Home-Bildschirm".
3. App vom Home-Bildschirm starten wie eine normale App.

## Google Sheet einrichten (einmalig)

1. Neues Google Sheet anlegen.
2. Menü **Erweiterungen → Apps Script** öffnen.
3. Inhalt aus [`apps-script/Code.gs`](apps-script/Code.gs) in den Editor einfügen (bestehenden Beispielcode ersetzen).
4. Speichern, dann **Bereitstellen → Neue Bereitstellung**.
5. Typ: **Web App**.
   - "Ausführen als": **Ich (dein Google-Konto)**
   - "Wer hat Zugriff": **Jeder** (nötig, damit die App ohne Google-Login POST-Requests senden kann)
6. Bereitstellen, Berechtigungen bestätigen.
7. Die angezeigte **Web-App-URL** (endet auf `/exec`) kopieren.

## App mit dem Sheet verbinden

1. In der App auf das Zahnrad-Symbol (⚙) tippen.
2. Die kopierte Web-App-URL einfügen, speichern.
3. Ab jetzt werden gestoppte/manuelle Einträge automatisch ins Sheet geschrieben (Tabellenblatt "Zeiten" wird automatisch angelegt).
4. Der Button "Synchronisieren" schickt alle noch nicht übertragenen Einträge erneut (z. B. nach Offline-Nutzung).

## Hosting (GitHub Pages)

Dieses Repo ist für GitHub Pages vorbereitet — kein Server nötig, alles läuft statisch im Browser.
