require("dotenv").config();
const axios = require("axios");

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

async function askClaude(question, sheetData) {
  if (!CLAUDE_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `You are a project dashboard assistant. Answer questions about project data.

DATA:
${JSON.stringify(sheetData, null, 2)}

ANSWER FORMAT - BE CONCISE:
- Use bullet points
- Keep answers SHORT and CLEAR
- No long paragraphs
- Show only relevant info
- Use simple language

STATUSES:
- W.I.P = Work In Progress
- OPEN = Not Started
- CLOSE = Completed
- Hired = Vendor Selected
- TBD = To Be Decided
- Pending = Waiting

QUESTION: ${question}

Answer CONCISELY with bullet points. Keep it SHORT.`
          }
        ]
      },
      {
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error("Claude error:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = askClaude;
