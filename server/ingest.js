require("dotenv").config();

const fs = require("fs");
const {
  RecursiveCharacterTextSplitter,
} = require("langchain/text_splitter");

const {
  pipeline,
} = require("@xenova/transformers");

async function ingestData() {
  try {
    console.log(
      "Reading knowledge file..."
    );

    const rawText =
      await fs.promises.readFile(
        "knowledge.txt",
        "utf-8"
      );

    const splitter =
      new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });

    const docs =
      await splitter.createDocuments([
        rawText,
      ]);

    console.log(
      `Created ${docs.length} chunks`
    );

    console.log(
      "Loading embedding model..."
    );

    const extractor =
      await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );

    const vectorData = [];

    for (const doc of docs) {
      const output =
        await extractor(doc.pageContent, {
          pooling: "mean",
          normalize: true,
        });

      vectorData.push({
        pageContent:
          doc.pageContent,
        metadata: doc.metadata,
        embedding:
          Array.from(output.data),
      });
    }

    fs.writeFileSync(
      "vectorStore/store.json",
      JSON.stringify(
        vectorData,
        null,
        2
      )
    );

    console.log(
      "Knowledge ingested successfully!"
    );
  } catch (error) {
    console.error(
      "Error:",
      error
    );
  }
}

ingestData();