require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(express.json());

const cors = require("cors");
app.use(cors());

const PORT = process.env.PORT || 3000;

let conversationHistory = [];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-001",
});

let knowledgeData = [];
try {
  const regularPath = path.join(__dirname, "vectorStore", "store.json");
  const lowerPath = path.join(__dirname, "vectorstore", "store.json");
  
  if (fs.existsSync(regularPath)) {
    knowledgeData = JSON.parse(fs.readFileSync(regularPath, "utf-8"));
  } else if (fs.existsSync(lowerPath)) {
    knowledgeData = JSON.parse(fs.readFileSync(lowerPath, "utf-8"));
  } else {
    console.log("⚠️ Warning: vectorStore/store.json not found, initializing empty context.");
  }
} catch (e) {
  console.error("Failed to read knowledge base file:", e);
}

function searchRelevantInfo(userMessage) {
  if (!knowledgeData || !Array.isArray(knowledgeData)) return "";
  const message = userMessage.toLowerCase();

  const matchedChunks = knowledgeData.filter(
    (chunk) =>
      chunk.pageContent &&
      chunk.pageContent.toLowerCase().includes(message)
  );

  return matchedChunks
    .map((chunk) => chunk.pageContent)
    .join("\n");
}

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    conversationHistory.push({
      role: "user",
      content: message,
    });

    if (conversationHistory.length > 5) {
      conversationHistory.shift();
    }

    const relevantInfo = searchRelevantInfo(message);

    const historyText = conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const promptText = `You are a helpful AI assistant.

Relevant Context:
${relevantInfo}

Recent Conversation:
${historyText}

User Question:
${message}

Answer clearly using the relevant context if helpful.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }]
    });

    const response = result.response.text();

    conversationHistory.push({
      role: "assistant",
      content: response,
    });

    if (conversationHistory.length > 5) {
      conversationHistory.shift();
    }

    res.json({
      response,
      memorySize: conversationHistory.length,
    });
  } catch (error) {
    console.error("FULL ERROR:", JSON.stringify(error, null, 2));
    console.error("Gemini Route Error:", error);
    res.status(500).json({
      error: "Something went wrong",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});