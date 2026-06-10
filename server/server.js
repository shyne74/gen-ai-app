require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { pipeline } = require("@xenova/transformers");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

const upload = multer({
  dest: "uploads/",
});

let extractor = null;
let modelReady = false;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

let knowledgeData = [];

// --------------------
// LOAD KB
// --------------------
function loadKnowledgeBase() {
  try {
    const storePath = path.join(
      __dirname,
      "vectorStore",
      "store.json"
    );

    if (fs.existsSync(storePath)) {
      knowledgeData = JSON.parse(
        fs.readFileSync(storePath, "utf-8")
      );

      console.log(
        `📚 Loaded ${knowledgeData.length} chunks`
      );
    } else {
      console.log(
        "📚 No existing store found"
      );
    }
  } catch (err) {
    console.error(
      "❌ KB Load Error:",
      err
    );
  }
}

loadKnowledgeBase();

// --------------------
// COSINE SIMILARITY
// --------------------
function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// --------------------
// KEYWORD SCORE
// --------------------
function keywordScore(text, query) {
  const words = query
    .toLowerCase()
    .split(/\s+/);

  const lowerText =
    text.toLowerCase();

  let score = 0;

  for (const word of words) {
    if (
      word.length > 1 &&
      lowerText.includes(word)
    ) {
      score++;
    }
  }

  return score;
}

// --------------------
// SEARCH
// --------------------
async function searchRelevantInfo(
  userMessage
) {
  if (
    !modelReady ||
    !extractor ||
    !knowledgeData.length
  ) {
    console.log(
      "❌ No knowledge data"
    );
    return [];
  }

  const emb =
    await extractor(
      userMessage,
      {
        pooling: "mean",
        normalize: true,
      }
    );

  const queryEmbedding =
    Array.from(emb.data);

  const scored =
    knowledgeData.map(
      (chunk) => {
        const semantic =
          cosineSimilarity(
            queryEmbedding,
            chunk.embedding
          );

        const keyword =
          keywordScore(
            chunk.pageContent,
            userMessage
          );

        return {
          content:
            chunk.pageContent,
          source:
            chunk.metadata
              ?.source ||
            "unknown",
          score:
            semantic *
              0.7 +
            keyword * 0.3,
        };
      }
    );

  scored.sort(
    (a, b) =>
      b.score - a.score
  );

  const topChunks =
    scored.slice(0, 5);

  console.log(
    "🔍 Retrieved:",
    topChunks.length,
    "chunks"
  );

  return topChunks;
}

// --------------------
// CLEAN SOURCES
// --------------------
function cleanSources(
  results
) {
  const map = new Map();

  for (const r of results) {
    const source =
      r.source;

    if (
      source &&
      source !==
        "unknown" &&
      !map.has(source)
    ) {
      map.set(source, {
        name: source,
        score: r.score,
      });
    }
  }

  return [
    ...map.values(),
  ];
}

// --------------------
// HEALTH
// --------------------
app.get(
  "/health",
  (req, res) => {
    res.json({
      ok: true,
      modelReady,
      chunks:
        knowledgeData.length,
    });
  }
);

// --------------------
// CHAT
// --------------------
app.post(
  "/chat",
  async (req, res) => {
    try {
      const {
        message,
      } = req.body;

      if (!message) {
        return res
          .status(400)
          .json({
            error:
              "No message",
          });
      }

      const retrieved =
        await searchRelevantInfo(
          message
        );

      const context =
        retrieved
          .map(
            (r) =>
              `[SOURCE: ${r.source}]\n${r.content}`
          )
          .join("\n\n");

      console.log(
        "📄 Context size:",
        context.length
      );

      const prompt = `
You MUST answer ONLY using the provided context.

If answer does not exist in context say:
"I could not find that in the uploaded document."

CONTEXT:
${context}

QUESTION:
${message}
`;

      const completion =
        await groq.chat.completions.create(
          {
            model:
              "llama-3.3-70b-versatile",
            messages: [
              {
                role:
                  "user",
                content:
                  prompt,
              },
            ],
          }
        );

      const response =
        completion
          .choices?.[0]
          ?.message
          ?.content ||
        "No response";

      res.json({
        response,
        sources:
          cleanSources(
            retrieved
          ),
      });
    } catch (err) {
      console.error(
        "🔥 CHAT ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Chat failed",
        details:
          err.message,
      });
    }
  }
);

// --------------------
// PDF UPLOAD
// --------------------
app.post(
  "/upload-pdf",
  upload.single("file"),
  async (req, res) => {
    try {
      console.log(
        "📄 Upload started"
      );

      if (!req.file) {
        return res
          .status(400)
          .json({
            error:
              "No file uploaded",
          });
      }

      if (
        !extractor
      ) {
        return res
          .status(500)
          .json({
            error:
              "Model not ready",
          });
      }

      const pdfBuffer =
        fs.readFileSync(
          req.file.path
        );

      console.log(
        "📖 Reading PDF"
      );

      const pdfData =
        await pdfParse(
          pdfBuffer
        );

      console.log(
        "✅ PDF parsed"
      );

      const splitter =
        new RecursiveCharacterTextSplitter(
          {
            chunkSize: 500,
            chunkOverlap: 50,
          }
        );

      const docs =
        await splitter.createDocuments(
          [
            pdfData.text,
          ]
        );

      console.log(
        `✂️ Created ${docs.length} chunks`
      );

      const vectorData =
        [];

      for (const doc of docs) {
        const emb =
          await extractor(
            doc.pageContent,
            {
              pooling:
                "mean",
              normalize:
                true,
            }
          );

        vectorData.push(
          {
            pageContent:
              doc.pageContent,
            metadata:
              {
                source:
                  req
                    .file
                    .originalname,
              },
            embedding:
              Array.from(
                emb.data
              ),
          }
        );
      }

      console.log(
        "🧠 Embeddings created"
      );

      const vectorDir =
        path.join(
          __dirname,
          "vectorStore"
        );

      if (
        !fs.existsSync(
          vectorDir
        )
      ) {
        fs.mkdirSync(
          vectorDir
        );
      }

      const storePath =
        path.join(
          vectorDir,
          "store.json"
        );

      // replace old data
      fs.writeFileSync(
        storePath,
        JSON.stringify(
          vectorData,
          null,
          2
        )
      );

      knowledgeData =
        vectorData;

      console.log(
        `✅ store.json saved (${vectorData.length} chunks)`
      );

      // remove temp file
      fs.unlinkSync(
        req.file.path
      );

      res.json({
        success: true,
        chunks:
          vectorData.length,
      });
    } catch (err) {
      console.error(
        "🔥 UPLOAD ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Upload failed",
        details:
          err.message,
      });
    }
  }
);

// --------------------
// LOAD MODEL
// --------------------
async function loadModel() {
  try {
    console.log(
      "Loading embedding model..."
    );

    extractor =
      await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );

    modelReady = true;

    console.log(
      "✅ Model loaded"
    );
  } catch (err) {
    console.error(
      "❌ Model failed:",
      err
    );
  }
}

// --------------------
// START SERVER
// --------------------
loadModel().then(() => {
  app.listen(
    PORT,
    () => {
      console.log(
        `🚀 Server running on port ${PORT}`
      );
    }
  );
});