// Netlify Function: /.netlify/functions/register
// Wird nach erfolgreicher PayPal-Zahlung vom Frontend aufgerufen.
// Ablauf: 1) PayPal-Zahlung serverseitig verifizieren
//         2) Anmeldung in VereinOnline anlegen
//         3) Bestätigungs-E-Mail senden (via Resend)
//
// Benötigte Umgebungsvariablen (Netlify: Site settings -> Environment variables):
//   PAYPAL_CLIENT_ID     - PayPal Client-ID (live oder sandbox)
//   PAYPAL_SECRET        - PayPal Secret
//   PAYPAL_ENV           - "live" oder "sandbox"
//   VO_BASE_URL          - z.B. https://www.vereinonline.org/WJFrankfurt
//   VO_API_USER          - VereinOnline API-Benutzer
//   VO_API_PASSWORD_MD5  - MD5-Hash des API-Passworts
//   VO_EVENT_ID          - 98726
//   RESEND_API_KEY       - (optional) API-Key von resend.com für Bestätigungsmail
//   MAIL_FROM            - (optional) Absender, z.B. "JCI Frankfurt <events@wj-frankfurt.de>"

const PAYPAL_API = (process.env.PAYPAL_ENV === "live")
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try { data = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: "Invalid JSON" }; }

  const { name, email, company, memberType, diet, dietNote, orderID } = data;
  if (!name || !email || !orderID) {
    return { statusCode: 400, body: "Missing required fields" };
  }

  // ---------- 1) PayPal-Zahlung verifizieren ----------
  try {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
    ).toString("base64");

    const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const { access_token } = await tokenRes.json();

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const order = await orderRes.json();

    const paid =
      order.status === "COMPLETED" &&
      order.purchase_units?.[0]?.amount?.value === "20.00" &&
      order.purchase_units?.[0]?.amount?.currency_code === "EUR";

    if (!paid) {
      return { statusCode: 402, body: "Payment not verified" };
    }
  } catch (e) {
    console.error("PayPal verification failed:", e);
    return { statusCode: 502, body: "PayPal verification failed" };
  }

  // ---------- 2) Anmeldung in VereinOnline anlegen ----------
  // VereinOnline-API: Token-Format "A/<benutzer>/<md5(passwort)>"
  // Doku: https://www.vereinonline.org (Administration -> Schnittstellen -> API)
  // WICHTIG: Den genauen API-Befehl fuer Veranstaltungsanmeldungen bitte mit der
  // VereinOnline-Doku eures Vereins abgleichen (z.B. "VeranstaltungAnmelden").
  try {
    const token = `A/${process.env.VO_API_USER}/${process.env.VO_API_PASSWORD_MD5}`;
    const voUrl =
      `${process.env.VO_BASE_URL}/?api=VeranstaltungAnmelden` +
      `&token=${encodeURIComponent(token)}`;

    const voRes = await fetch(voUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id: process.env.VO_EVENT_ID || "98726",
        name: name,
        email: email,
        firma: company || "",
        status: memberType === "member" ? "Mitglied" : "Gast",
        bemerkung:
          `Essenswunsch: ${diet || "keiner"}` +
          (dietNote ? ` (${dietNote})` : "") +
          ` | PayPal-Order: ${orderID} | 20,00 EUR bezahlt`,
      }).toString(),
    });

    const voText = await voRes.text();
    console.log("VereinOnline response:", voText);
    if (!voRes.ok || voText.toLowerCase().includes("error")) {
      throw new Error(voText);
    }
  } catch (e) {
    console.error("VereinOnline registration failed:", e);
    // Zahlung war erfolgreich -> 502 zurueckgeben, damit das Frontend den
    // Hinweis "manuelle Anmeldung" anzeigt. Die Order-ID steht im Log.
    return { statusCode: 502, body: "VereinOnline registration failed" };
  }

  // ---------- 3) Bestätigungs-E-Mail senden (optional, via Resend) ----------
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || "events@example.com",
          to: [email],
          subject: "Your registration – SME International Leadership Day 2026",
          html: `
            <h2>Thank you for your registration, ${name}!</h2>
            <p>We're excited to welcome you to the <strong>SME International
            Leadership Day 2026 – Lead Beyond Borders</strong>.</p>
            <ul>
              <li><strong>Date:</strong> 25 September 2026, from 09:00</li>
              <li><strong>Location:</strong> IHK Frankfurt am Main</li>
              <li><strong>Ticket:</strong> €20.00 – paid via PayPal (Order ${orderID})</li>
            </ul>
            <p>Your registration has been recorded. See you in Frankfurt!</p>
            <p>JCI Frankfurt / Wirtschaftsjunioren Frankfurt am Main</p>`,
        }),
      });
    } catch (e) {
      console.error("Confirmation e-mail failed (registration still OK):", e);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
