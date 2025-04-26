const fs = require('fs');

// Read the whole extracted Swaminarayan text
const rawText = fs.readFileSync('./Swaminarayan.txt', 'utf-8');

// Split text into lines
const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

let chunks = [];
let currentChunk = '';

for (const line of lines) {
  if ((currentChunk + ' ' + line).split(' ').length > 450) {
    // Save current chunk when it exceeds ~450 words
    chunks.push(currentChunk.trim());
    currentChunk = line;
  } else {
    currentChunk += ' ' + line;
  }
}

// Push any leftover text
if (currentChunk.length > 0) {
  chunks.push(currentChunk.trim());
}

// Save all chunks to a NEW JSON Lines file (each line is a JSON object)
const output = chunks.map((chunk, index) => ({
  id: `swaminarayan_chunk_${index}`,
  text: chunk
}));

fs.writeFileSync('./swaminarayan_chunks.jsonl', output.map(JSON.stringify).join('\n'), 'utf-8');

console.log(`✅ Split completed. Total Chunks: ${chunks.length}`);
console.log('📂 Output saved to pdfReader/swaminarayan_chunks.jsonl');