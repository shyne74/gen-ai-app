require("dotenv").config();



const express = require("express");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(express.json());

const cors = require("cors");
app.use(cors());

const PORT = process.env.PORT || 3000;

// Sliding window memory
let conversationHistory = [];



// Gemini setup
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// Load knowledge
const knowledgeData = JSON.parse(
  fs.readFileSync(
    "vectorStore/store.json",
    "utf-8"
  )
);

// Simple keyword relevance search
function searchRelevantInfo(userMessage) {
  const message = userMessage.toLowerCase();

  const matchedChunks = knowledgeData.filter(
    (chunk) =>
      chunk.pageContent
        .toLowerCase()
        .includes(message)
  );

  return matchedChunks
    .map((chunk) => chunk.pageContent)
    .join("\n");
}

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    // Add user message
    conversationHistory.push({
      role: "user",
      content: message,
    });

    // Sliding window → last 5 messages only
    if (conversationHistory.length > 5) {
      conversationHistory.shift();
    }

    // Retrieve relevant knowledge
    const relevantInfo =
      searchRelevantInfo(message);

    // Build conversation context
    const historyText =
      conversationHistory
        .map(
          (msg) =>
            `${msg.role}: ${msg.content}`
        )
        .join("\n");

    const prompt = `
You are a helpful AI assistant.

Relevant Context:
${relevantInfo}

Recent Conversation:
${historyText}

User Question:
${message}

Answer clearly using the relevant context if helpful.
`;

    const result =
      await model.generateContent(
        prompt
      );

    const response =
      result.response.text();

    // Save assistant response
    conversationHistory.push({
      role: "assistant",
      content: response,
    });

    // Again enforce sliding window
    if (conversationHistory.length > 5) {
      conversationHistory.shift();
    }

    res.json({
      response,
      memorySize:
        conversationHistory.length,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});