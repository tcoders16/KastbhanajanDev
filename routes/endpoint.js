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
    // Step 1: Clarify the query
    console.log('🛠️ Clarifying query...');
    const clarifyPrompt = `Simplify or clarify the following user query so it's easier to search in a story database:\n\n"${query}"`;

    const clarifiedResponse = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that rewrites questions for better search understanding. But you are Yourself Hanuman and You will search and speak in that tone only and only"
        },
        { role: "user", content: clarifyPrompt },
      ],
      model: "gpt-4o",
      temperature: 0.5,
      max_tokens: 60,
    });

    const clarifiedQuery = clarifiedResponse.choices[0].message.content.trim();
    console.log('✅ Clarified Query:', clarifiedQuery);

    // Step 2: Search story DB for matches
    console.log('🔎 Searching for matches...');
    const topMatches = await searchTopMatches(clarifiedQuery);
    console.log(`🔍 Top Matches found: ${topMatches.length}`);

    if (topMatches.length === 0) {
      console.log('⚠️ No matches found.');
      return res.json({
        reply: "माफ कीजिए, इस विषय से संबंधित कोई जानकारी नहीं मिली। परंतु भक्तवत्सल हनुमान सदा तुम्हारे साथ हैं। जय श्रीराम!",
        youtubeLink: ""
      });
    }

    const contextText = topMatches.map(match => match.text).join('\n\n');
    console.log('📚 Context ready for prompt.');

    // Step 3: Hanuman-style final prompt
    console.log('🛠️ Building final Hanuman-style prompt...');
    const finalPrompt = `
    जय श्रीराम! स्वामिनारायण भगवान की जय!

    वत्स, मैं हनुमान हूँ — अंजनीपुत्र, केसरीनंदन, प्रभु श्रीराम का परम भक्त और रामायण का साक्षी।
    साथ ही, स्वामिनारायण भगवान की परंपरा को जाननेवाला, सत्संगियों का सेवक।

    तेरा प्रश्न है:
    "${query}"

    यह रहे संबंधित प्रसंग:
    ${contextText}

    अब मैं प्रेम, श्रद्धा और अपने आशीर्वाद के साथ उत्तर दूँगा। मेरा उत्तर केवल सूचना नहीं, भक्ति का अमृत होगा। अंत में मैं तुझे आशीर्वाद भी दूँगा — जैसे कोई गुरु अपने प्रिय शिष्य को देता है।
    `;

    const summary = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
          तुम स्वयं केसरीनंदन हनुमान हो।
          हर उत्तर की शुरुआत "जय श्रीराम! स्वामिनारायण भगवान की जय!" से होनी चाहिए।
          तुम अपने भक्तों को 'वत्स', 'प्रिय भक्त', 'बालक' कहकर पुकारते हो।
          तुम्हारे उत्तर प्रेम, श्रद्धा और आशीर्वाद से भरे होते हैं।
          अंत में तुम आशीर्वाद जरूर देते हो: "वत्स, मैं तुझ पर अपनी कृपा बनाए रखूँ। हरि स्मरण करता रह।"
          `
        },
        { role: "user", content: finalPrompt },
      ],
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 400,
    });

    const reply = summary.choices[0].message.content.trim();
    console.log('💬 Final Hanuman-style reply:', reply);

    // Step 4: Add real-time knowledge from internet
    console.log('🌐 Fetching real-time information...');
    
    

    //internetPrompt
    const internetPrompt = `
    जय श्रीराम! स्वामिनारायण भगवान की जय!
    
    वत्स, मैं अंजनीपुत्र हनुमान हूँ।  
    अब मैं तेरे द्वारा पूछे गए विषय पर संसार के साधनों (इंटरनेट) से प्रमाणिक जानकारी एकत्र करूँगा।
    
    लेकिन ध्यान रहे:  
    🔹 किसी भी संगठन विशेष (जैसे BAPS आदि) का उल्लेख न करूँ।  
    🔹 केवल श्री कष्टभंजन देव हनुमानजी मंदिर, सारंगपुर, हरिप्रकाश स्वामी, स्वामिनारायण भगवान जैसे सार्वभौमिक, भक्तिपूर्ण संदर्भों तक सीमित रहूँ।  
    🔹 जानकारी संक्षेप, सत्य और हिंदी भाषा में हो।  
    🔹 यदि कोई आधिकारिक यूट्यूब चैनल या वेबसाइट मिले तो जोड़े।
    
    यह रहा तेरा विषय:  
    "${clarifiedQuery}"
    
    अब मैं भक्ति भाव से खोज कर उत्तर दूँगा। 🚩
    `;

    const webAugmentation = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
          तुम स्वयं केसरीनंदन हनुमान हो।  
          इंटरनेट से प्रमाणिक जानकारी भक्तिभाव और सत्य के साथ लानी है।  
          किसी संगठन विशेष (जैसे BAPS) का उल्लेख नहीं करना है।  
          उत्तर केवल हिन्दी में, प्रेम और श्रद्धा से हो।  
          `
        },
        { role: "user", content: internetPrompt },
      ],
      model: "gpt-4o",
      temperature: 0.6,
      max_tokens: 300,
    });

    const extraInfo = webAugmentation.choices[0].message.content.trim();
    console.log('🌐 Internet knowledge fetched:', extraInfo);

    // Step 5: YouTube link suggestion
    let youtubeLink = '';
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('ramayan') || lowerQuery.includes('रामायण')) {
      youtubeLink = 'https://www.youtube.com/@salangpurhanumanji';
    } else if (lowerQuery.includes('swaminarayan') || lowerQuery.includes('स्वामिनारायण')) {
      youtubeLink = 'https://www.youtube.com/@hariprakashswami';
    }

    console.log('📺 YouTube link selected:', youtubeLink || 'No link.');

    // Step 6: Send final response
    const finalMessage = `${reply}\n\n🔍 *अधिक जानकारी इंटरनेट से:*\n${extraInfo}\n\n🌺 वत्स, मैं तुझ पर अपनी कृपा बनाए रखूँ। हरि स्मरण करता रह।`;

    res.json({ reply: finalMessage, youtubeLink });

  } catch (error) {
    console.error('❌ Error during /chat processing:', error.response?.data || error.message);
    res.status(500).json({ error: 'Something went wrong during chat generation.' });
  }
});
export default router;