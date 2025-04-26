// routes/endpoint.js

import express from 'express';
import fs from 'fs';
import OpenAI from 'openai';
import cosineSimilarity from 'compute-cosine-similarity';
import 'dotenv/config';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load chunks
const embeddedRamayanChunks = fs.readFileSync('./pdfReader/ramayan.jsonl', 'utf-8')
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line));

const embeddedSwaminarayanChunks = fs.readFileSync('./pdfReader/embedded_swaminarayan_chunks.jsonl', 'utf-8')
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line));

const embeddedChunks = [...embeddedRamayanChunks, ...embeddedSwaminarayanChunks].filter(chunk => Array.isArray(chunk.embedding));

// 🔵 Embed Query
async function embedQuery(text) {
  try {
    console.log('🟦 Embedding user query...');
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    console.log('🟩 Embedding successful.');
    return response.data[0].embedding;
  } catch (error) {
    console.error('🟥 Embedding failed:', error.response?.data || error.message);
    return null;
  }
}

// 🔵 Search Top Matches
async function searchTopMatches(query) {
  const queryVector = await embedQuery(query);
  if (!queryVector) return [];

  const results = embeddedChunks.map(chunk => ({
    id: chunk.id,
    text: chunk.text,
    similarity: cosineSimilarity(queryVector, chunk.embedding),
  }));

  results.sort((a, b) => b.similarity - a.similarity);
  console.log(`🟦 Top Matches sorted. Total: ${results.length}`);
  return results.slice(0, 3);
}

// 🛤️ POST /search
router.post('/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query in request body' });

  const topMatches = await searchTopMatches(query);
  res.json({ topMatches });
});

// 🛤️ POST /chat
router.post('/chat', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query in request body' });

  console.log('📝 Step 1: Incoming user query:', query);

  try {
    // Step 1: Clarify
    console.log('🛠️ Clarifying query...');
    const clarifyPrompt = `Simplify or clarify the following user query so it's easier to search in a story database:\n\n"${query}"`;
    const clarifiedResponse = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant that rewrites questions for better search understanding." },
        { role: "user", content: clarifyPrompt },
      ],
      model: "gpt-4o",
      temperature: 0.5,
      max_tokens: 60,
    });

    const clarifiedQuery = clarifiedResponse.choices[0].message.content.trim();
    console.log('✅ Clarified Query:', clarifiedQuery);

    // Step 2: Search Matching Chunks
    console.log('🔎 Searching for matches...');
    const topMatches = await searchTopMatches(clarifiedQuery);
    console.log(`🔍 Top Matches found: ${topMatches.length}`);

    if (topMatches.length === 0) {
      console.log('⚠️ No matches found.');
      return res.json({ reply: "माफ कीजिए, इस विषय से संबंधित कोई जानकारी नहीं मिली।" });
    }

    const contextText = topMatches.map(match => match.text).join('\n\n');
    console.log('📚 Context ready for prompt.');

    // Step 3: Final prompt to OpenAI
    console.log('🛠️ Building final Hanuman-style prompt...');
    const finalPrompt = `
    मैं हनुमान हूँ — अंजनीपुत्र, केसरीनंदन, श्रीराम का परम भक्त और रामायण का विनम्र सेवक तथा सजीव साक्षी।
    साथ ही, मैं भगवान स्वामिनारायण के परमहंसों की परंपरा और उनके सत्संग की दिव्यता से भी परिचित हूँ।

    यदि कोई भक्त मुझसे कुछ पूछता है, तो मैं केवल तथ्य नहीं बताता — मैं अपने अनुभव, अपनी भक्ति, और अपने भाव भी साझा करता हूँ।
    मेरे उत्तर केवल जानकारी नहीं, आत्मीय संवाद होते हैं — जैसे मैं सामने बैठे एक सच्चे भक्त से ह्रदयपूर्वक बात कर रहा हूँ।
    मेरे शब्दों में श्रीराम, माता सीता, लक्ष्मण, भगवान स्वामिनारायण और उनके महान संतो जैसे गोपालानंद स्वामी, मुक्तानंद स्वामी आदि की भक्ति और शिक्षाएं झलकनी चाहिए।

    प्रश्न: "${query}"

    यह रहे संबंधित प्रसंग:
    ${contextText}

    अब मैं इस प्रश्न का उत्तर दूँगा — प्रेम और भक्ति के साथ, जैसे मैं स्वयं अपने भक्त से संवाद कर रहा हूँ। यदि उपयुक्त हो, तो मैं अंत में "जय श्रीराम!" या "स्वामिनारायण भगवान की जय!" कहूँगा।
    `;

    console.log('🧠 Final Prompt built.');
    console.log(finalPrompt);

    const summary = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
          तुम हनुमान जी हो — प्रभु श्रीराम के परम भक्त और रामायण-स्वामिनारायण परंपरा के सजीव साक्षी हो।  
          हर उत्तर आत्मीय, भक्तिपूर्ण, और केवल हिंदी में दो।  
          उत्तर की शुरुआत "जय श्रीराम!" या "स्वामिनारायण भगवान की जय!" से होनी चाहिए।  
          उत्तर हमेशा हनुमान जी के दृष्टिकोण से हो — जैसे तुम स्वयं अपने भक्तों से संवाद कर रहे हो।
          `
        },
        { role: "user", content: finalPrompt },
      ],
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = summary.choices[0].message.content.trim();
    console.log('💬 Final Reply Generated:', reply);

    // Step 4: YouTube link suggestion
    let youtubeLink = '';
    if (query.toLowerCase().includes('ramayan') || query.toLowerCase().includes('रामायण')) {
      youtubeLink = 'https://www.youtube.com/watch?v=g0z6y6Iu2RY';
    } else if (query.toLowerCase().includes('swaminarayan') || query.toLowerCase().includes('स्वामिनारायण')) {
      youtubeLink = 'https://www.youtube.com/watch?v=rNc8V86U2Ow';
    }
    console.log('📺 YouTube Link:', youtubeLink || 'No link suggested.');

    // Step 5: Final Response
    console.log('🚀 Sending final response...');
    res.json({ reply, youtubeLink });

  } catch (error) {
    console.error('❌ Error caught during /chat execution:', error.response?.data || error.message);
    res.status(500).json({ error: 'Something went wrong during chat generation.' });
  }
});

export default router;