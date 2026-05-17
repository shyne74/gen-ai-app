require("dotenv").config();

const fs = require("fs");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

async function ingestData() {
  try {
    console.log("📚 Reading knowledge file...");

    const rawText = fs.readFileSync(
      "knowledge.txt",
      "utf-8"
    );

    const splitter =
      new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });

    const docs =
      await splitter.createDocuments([rawText]);

    console.log(
      `✅ Created ${docs.length} chunks`
    );

    const vectorData = docs.map((doc) => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata,
    }));

    fs.writeFileSync(
      "vectorStore/store.json",
      JSON.stringify(vectorData, null, 2)
    );

    console.log(
      "✅ Knowledge ingested successfully!"
    );
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

ingestData();