import 'dotenv/config'; // Replaces require('dotenv').config();
import fs from 'fs'; // Replaces require('fs');
import OpenAI from 'openai'; // Replaces require('openai');


// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Your
});

// Load Swaminarayan chunks from root folder
const chunks = fs.readFileSync('./swaminarayan_chunks.jsonl', 'utf-8')
  .split('\n')
  .filter(line => line.trim() !== '')
  .map(line => JSON.parse(line));

async function generateEmbedding(text) {
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error.response ? error.response.data : error.message);
    return null;
  }
}

async function embedAllChunks() {
  const embeddedChunks = [];

  for (const chunk of chunks) {
    console.log(`🔹 Embedding chunk: ${chunk.id}`);
    const embedding = await generateEmbedding(chunk.text);

    if (embedding) {
      embeddedChunks.push({
        id: chunk.id,
        text: chunk.text,
        embedding: embedding,
      });
    }
  }

  try {
    fs.writeFileSync('./embedded_swaminarayan_chunks.jsonl', embeddedChunks.map(JSON.stringify).join('\n'), 'utf-8');
    console.log(`✅ All embeddings completed!`);
    console.log(`📂 Output saved to embedded_swaminarayan_chunks.jsonl`);
  } catch (error) {
    console.error(`❌ Error writing embedded chunks file: ${error.message}`);
  }
}

// Start embedding process
embedAllChunks();
