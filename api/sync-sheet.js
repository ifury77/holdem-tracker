// Vercel serverless function (Node.js runtime)
// Reads the rightmost (most recent) tab of a private Google Sheet using a
// service account, and returns {players, extras} in the same shape the
// Scan feature uses — so the frontend can reuse the exact same merge logic.
//
// Requires three environment variables in the Vercel project:
//   GOOGLE_SA_EMAIL  - service account client_email
//   GOOGLE_SA_KEY    - service account private_key (with real newlines or \n escapes, either is handled below)
//   GOOGLE_SHEET_ID  - the spreadsheet ID from its URL
//
// The sheet must be shared with the service account email as Viewer.

import crypto from "crypto";

const KNOWN_NAMES = ["IO","PN","CW","BT","AK","DS","PK","SC","YS","SY","DT","JN","KC","JW","DH"];

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SA_EMAIL;
  let key = process.env.GOOGLE_SA_KEY || "";
  if (!email || !key) throw new Error("Missing GOOGLE_SA_EMAIL or GOOGLE_SA_KEY");

  // Defensively normalize the key: strip accidental wrapping quotes, convert
  // literal \n escapes and CRLF to real newlines, ensure a trailing newline.
  key = key.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  if (!key.endsWith("\n")) key += "\n";
  if (!key.includes("BEGIN PRIVATE KEY") && !key.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error("GOOGLE_SA_KEY doesn't look like a valid PEM private key (missing BEGIN header) — re-check it was copied in full");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const unsigned = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claims));
  let signature;
  try {
    const keyObject = crypto.createPrivateKey({ key, format: "pem" });
    signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), keyObject)
      .toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  } catch (e) {
    const lines = key.split("\n");
    const diag = {
      totalLength: key.length,
      lineCount: lines.length,
      firstLine: lines[0],
      lastNonEmptyLine: [...lines].reverse().find(l=>l.trim())||"",
      startsCorrectly: key.startsWith("-----BEGIN PRIVATE KEY-----"),
      endsCorrectly: key.trim().endsWith("-----END PRIVATE KEY-----")
    };
    throw new Error("Could not parse GOOGLE_SA_KEY: " + e.message + " | diag: " + JSON.stringify(diag));
  }
  const jwt = unsigned + "." + signature;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error("Token request failed: " + (data.error_description || data.error || resp.status));
  return data.access_token;
}

function findHeaderRow(rows, mustInclude) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    if (mustInclude.every(label => row.some(cell => (cell || "").toString().trim() === label))) {
      return r;
    }
  }
  return -1;
}

function colIndex(row, label) {
  return row.findIndex(cell => (cell || "").toString().trim() === label);
}

function parseNum(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(String(v).replace(/[,$]/g, "").replace(/^-?\((.*)\)$/, "-$1"));
  return isNaN(n) ? 0 : n;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) return res.status(500).json({ error: "Server missing GOOGLE_SHEET_ID" });

  try {
    const token = await getAccessToken();

    // 1. List tabs (in sheet order)
    const metaResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const meta = await metaResp.json();
    if (!metaResp.ok) return res.status(502).json({ error: meta.error?.message || "Failed to list sheet tabs" });

    const sheets = (meta.sheets || []).map(s => s.properties).sort((a,b)=>a.index-b.index);
    if (!sheets.length) return res.status(502).json({ error: "No tabs found in spreadsheet" });

    // 2. Scan backward from the last tab, skip the trailing aggregate sheet (no "Players" header),
    //    and use the first date-tab that actually has real data (a Buy-In > 0 for someone) —
    //    later tabs are often pre-made empty templates for future dates.
    let tabTitle = null, rows = null;
    for (let i = sheets.length - 1; i >= 0; i--) {
      const candidate = sheets[i].title;
      const range = `'${candidate}'!A1:AD60`;
      const valuesResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const valuesData = await valuesResp.json();
      if (!valuesResp.ok) continue;
      const candidateRows = valuesData.values || [];
      const hIdx = findHeaderRow(candidateRows, ["Players", "Buy-In ($)"]);
      if (hIdx < 0) continue; // not a date-session tab (e.g. the trailing YTD/attendance sheet)
      const header = candidateRows[hIdx];
      const buyInCol = colIndex(header, "Buy-In ($)");
      const hasData = candidateRows.slice(hIdx + 1).some(r => parseNum(r[buyInCol]) > 0);
      if (hasData) { tabTitle = candidate; rows = candidateRows; break; }
    }
    if (!tabTitle) return res.status(502).json({ error: "No tab with active session data found" });

    // 3. Find the player table header row (has "Players", "Buy-In ($)", "Final Chips ($)")
    const headerIdx = findHeaderRow(rows, ["Players", "Buy-In ($)", "Final Chips ($)"]);
    const players = [];
    if (headerIdx >= 0) {
      const header = rows[headerIdx];
      const nameCol = colIndex(header, "Players");
      const buyInCol = colIndex(header, "Buy-In ($)");
      const chipsCol = colIndex(header, "Final Chips ($)");
      for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const name = (row[nameCol] || "").toString().trim().toUpperCase();
        if (!name) break; // stop at first blank name (end of player list)
        const buyIn = parseNum(row[buyInCol]);
        if (buyIn <= 0) continue; // didn't play this session
        players.push({
          name,
          rebuys: Math.round(buyIn / 1000),
          finalChips: parseNum(row[chipsCol])
        });
      }
    }

    // 4. Find the expenses table header row (has "Amount ($)" and "Description")
    const expHeaderIdx = findHeaderRow(rows, ["Amount ($)", "Description"]);
    const extras = [];
    if (expHeaderIdx >= 0) {
      const header = rows[expHeaderIdx];
      const amtCol = colIndex(header, "Amount ($)");
      const descCol = colIndex(header, "Description");
      for (let r = expHeaderIdx + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const desc = (row[descCol] || "").toString().trim();
        const amt = parseNum(row[amtCol]);
        if (!desc && !amt) continue;
        // Skip bare-initials rebate lines (e.g. just "JN") — the app derives rebate itself
        if (KNOWN_NAMES.includes(desc.toUpperCase())) continue;
        if (/^net tax$|^net contribution$|^previous amount$|^current amount$/i.test(desc)) break;
        if (desc && amt) extras.push({ label: desc, amount: amt });
      }
    }

    return res.status(200).json({ tab: tabTitle, players, extras });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
