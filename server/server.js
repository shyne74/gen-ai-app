require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path"); // Added to handle reliable paths
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(express.json());

const cors = require("cors");
app.use(cors());

const PORT = process.env.PORT || 3000;

// Sliding window memory
let conversationHistory = [];

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // Replaced with completely stable production model
});

// Safely load knowledge regardless of absolute server paths
let knowledgeData = [];
try {
  // Checks lowercase and uppercase variants to prevent Linux deployment crashes
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

// Simple keyword relevance search
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
    const relevantInfo = searchRelevantInfo(message);

    // Build conversation context
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

    // Wrapped correctly inside a standard contents text configuration object for Gemini SDK
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }]
    });

    const response = result.response.text();

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
      memorySize: conversationHistory.length,
    });
  } catch (error) {
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