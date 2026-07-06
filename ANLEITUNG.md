# SME International Leadership Day 2026 – Website

## Dateien

- `index.html` – komplette Landingpage inkl. Anmeldeformular und PayPal-Button
- `netlify/functions/register.js` – Serverfunktion: PayPal-Prüfung → VereinOnline → Bestätigungsmail
- `netlify.toml` – Netlify-Konfiguration

## Deployment (Schritt für Schritt)

### 1. Vorschau lokal
`index.html` einfach im Browser öffnen. Der PayPal-Button erscheint erst, wenn die Client-ID eingetragen ist (siehe Schritt 3).

### 2. Auf Netlify veröffentlichen
1. https://app.netlify.com → einloggen (oder Konto anlegen)
2. "Add new site" → "Deploy manually" → den gesamten Ordner `sme-leadership-day` per Drag & Drop hineinziehen
3. Fertig – die Seite läuft unter `<name>.netlify.app`. Eigene Domain: Site settings → Domain management.

### 3. PayPal aktivieren
1. https://developer.paypal.com → mit dem Business-Konto einloggen → Apps & Credentials → App erstellen
2. **Sandbox-Client-ID** zum Testen, **Live-Client-ID** für den Echtbetrieb
3. In `index.html` die Konstante `PAYPAL_CLIENT_ID` ersetzen
4. In Netlify unter Site settings → Environment variables setzen:
   - `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_ENV` (`sandbox` oder `live`)
5. Neu deployen. Erst mit Sandbox testen, dann auf live umstellen!

### 4. VereinOnline verbinden
In Netlify diese Umgebungsvariablen setzen:

- `VO_BASE_URL` – z. B. `https://www.vereinonline.org/WJFrankfurt` (exakte URL aus eurem Admin-Bereich)
- `VO_API_USER` – API-Benutzer (Administration → Schnittstellen → API)
- `VO_API_PASSWORD_MD5` – MD5-Hash des API-Passworts
- `VO_EVENT_ID` – `98726`

⚠️ **Wichtig:** Der API-Befehl `VeranstaltungAnmelden` in `register.js` muss mit eurer
VereinOnline-API-Doku abgeglichen werden (Befehlsname und Feldnamen können abweichen).
Das testen wir gemeinsam, sobald du den API-Zugang hast. Fallback: Die Funktion loggt
jede Anmeldung inkl. PayPal-Order-ID in den Netlify-Function-Logs.

### 5. Bestätigungs-E-Mail
Aktuell via https://resend.com (kostenlos bis 100 Mails/Tag):

- `RESEND_API_KEY` – API-Key von Resend
- `MAIL_FROM` – z. B. `JCI Frankfurt <events@wj-frankfurt.de>` (Domain muss bei Resend verifiziert werden)

Alternative: Wenn VereinOnline bei API-Anmeldungen selbst Bestätigungen verschickt, kann dieser Teil entfallen.

### 6. Noch offen / bitte prüfen

- Exakte Links zu Impressum & Datenschutz der WJ-Frankfurt-Seite im Footer eintragen (aktuell verlinkt auf die Startseite)
- Logo einfügen, falls gewünscht (Bilddatei an mich schicken)
- Teilnehmerlimit/Anmeldeschluss, falls benötigt
