// Vercel serverless function (Node.js runtime)
// Receives a base64 screenshot of a scoresheet and returns structured session data
// matching the app's players/extras shape, using Claude's vision API.
//
// Requires an ANTHROPIC_API_KEY environment variable set in the Vercel project
// (Project Settings → Environment Variables). Never expose this key client-side.

const KNOWN_NAMES = ["IO","PN","CW","BT","AK","DS","PK","SC","YS","SY","DT","JN","KC","JW","DH"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, mediaType } = req.body || {};
  if (!image) {
    return res.status(400).json({ error: "Missing image" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server missing ANTHROPIC_API_KEY" });
  }

  const prompt = `You are reading a poker session scoresheet screenshot for the "RiverRat Masters" (MPS) group.

Known player initials that may appear: ${KNOWN_NAMES.join(", ")}. The sheet may also include
other/guest initials not in this list — include those too, using whatever initials are shown.

Extract and return ONLY a JSON object (no markdown fences, no commentary) with this exact shape:
{
  "date": "YYYY-MM-DD",
  "players": [
    { "name": "XX", "rebuys": <integer, buy-in amount divided by 1000>, "finalChips": <integer> }
  ],
  "extras": [
    { "label": "<description text as shown>", "amount": <number> }
  ]
}

Rules:
- Only include players who appear in the sheet's "Players" rows (buy-in > 0).
- "rebuys" = the player's total Buy-In amount ÷ 1000, rounded to the nearest whole number.
- "finalChips" = the player's Final Chips value.
- Do not compute winnings, tax, rebate, or settlement yourself — the app derives those.
- For "extras", include every row from the expenses/amount+description table on the sheet,
  using its Amount as "amount" and its Description text as "label" (e.g. "Dinner (SY)").
- If the date isn't legible, omit the "date" field entirely rather than guessing.
- Respond with raw JSON only.`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType || "image/png", data: image } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      return res.status(502).json({ error: data?.error?.message || "Anthropic API error" });
    }

    const textBlock = (data.content || []).find(b => b.type === "text");
    if (!textBlock) return res.status(502).json({ error: "No text in model response" });

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(502).json({ error: "Could not parse model output as JSON", raw: cleaned });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

