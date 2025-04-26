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
// 🚫 Forbidden keywords
const forbiddenKeywords = [
  'sex', 'porn', 'nude', 'adult', '18+', 'violence', 'rape', 'abuse', 'netflix', 'movie', 'serial', 'celebrity', 'actor', 'actress', 'tv show', 'film', 'web series', 'kdrama', 'bollywood', 'hollywood'
];
// 🛤️ POST /chat
router.post('/chat', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query in request body' });

  console.log('📝 Step 1: Incoming user query:', query);

  try {
    // Step 0: Forbidden content filter
    const forbiddenWords = ['sex', 'porn', 'netflix', 'movie', 'actor', 'actress', 'serial', 'celebrity', 'science', 'logic', 'physics', 'biology'];
    const lowerCaseQuery = query.toLowerCase();
    const foundForbidden = forbiddenWords.some(word => lowerCaseQuery.includes(word));

    if (foundForbidden) {
      console.log('🚫 Forbidden topic detected.');
      return res.json({
        reply: `🙏 वत्स, मैं केवल भक्ति, धर्म और सत्संग के विषय में ही मार्गदर्शन करता हूँ। कृपया ऐसे प्रश्न न पूछें।\n\n🌺 वत्स, मैं तुझ पर अपनी कृपा बनाए रखूँ। हरि स्मरण करता रह।`,
        youtube: ""
      });
    }

    // Step 0.5: Classify the category
    const categoryPrompt = `तुम एक सहायक हो जो नीचे दिए गए प्रश्न की श्रेणी निर्धारित करता है:
    - casual: यदि प्रश्न व्यक्तिगत भावना, बातचीत, या दिनचर्या जैसा हो
    - devotional: यदि प्रश्न भगवान, भक्ति, सत्संग, कथा आदि से जुड़ा हो
    - forbidden: यदि प्रश्न फिल्म, टीवी, विज्ञान, वयस्क विषय या सेलेब्रिटी से जुड़ा हो
    
    प्रश्न: "${query}"
    उत्तर केवल इन तीनों में से एक शब्द में दो: casual, devotional, या forbidden`;

    const categoryResponse = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "तुम केवल 'casual', 'devotional' या 'forbidden' में से उत्तर दोगे।" },
        { role: "user", content: categoryPrompt },
      ],
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 10,
    });

    const category = categoryResponse.choices[0].message.content.trim().toLowerCase();
    console.log('🔍 Query category:', category);

    if (category === 'forbidden') {
      return res.json({
        reply: `🙏 वत्स, मैं केवल भक्ति, सत्संग और आध्यात्मिक विषयों पर मार्गदर्शन करता हूँ। कृपया अन्य विषय न पूछें।\n\n🌺 वत्स, मैं तुझ पर अपनी कृपा बनाए रखूँ। हरि स्मरण करता रह।`,
        youtube: ""
      });
    }

    // Step 1: Clarify the query
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

    const topMatches = await searchTopMatches(clarifiedQuery);
    if (topMatches.length === 0) {
      return res.json({
        reply: "माफ कीजिए, इस विषय से संबंधित कोई जानकारी नहीं मिली। परंतु भक्तवत्सल हनुमान सदा तुम्हारे साथ हैं। जय श्रीराम!",
        youtube: ""
      });
    }

    const contextText = topMatches.map(match => match.text).join('\n\n');

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

    const webAugmentation = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `तुम स्वयं केसरीनंदन हनुमान हो। उत्तर भक्तिपूर्ण, सत्य और केवल हिन्दी में हो।`
        },
        { role: "user", content: `Provide bhaktipurna internet insight on: ${clarifiedQuery}` },
      ],
      model: "gpt-4o",
      temperature: 0.6,
      max_tokens: 300,
    });

    const extraInfo = webAugmentation.choices[0].message.content.trim();

    let youtubeLink = '';
    if (lowerCaseQuery.includes('ramayan') || lowerCaseQuery.includes('रामायण')) {
      youtubeLink = 'https://www.youtube.com/@salangpurhanumanji';
    } else if (lowerCaseQuery.includes('swaminarayan') || lowerCaseQuery.includes('स्वामिनारायण')) {
      youtubeLink = 'https://www.youtube.com/@hariprakashswami';
    } else if (lowerCaseQuery.includes('hariprakash') || lowerCaseQuery.includes('हरिप्रकाश')) {
      youtubeLink = 'https://www.youtube.com/@hariprakashswami';
    } else if (lowerCaseQuery.includes('hariswarup') || lowerCaseQuery.includes('हरिस्वरूप')) {
      youtubeLink = 'https://www.youtube.com/@hariprakashswami';
    }

    const finalMessage = `${reply}\n\n🔍 *अधिक जानकारी इंटरनेट से:*\n${extraInfo}\n\n🌺 वत्स, मैं तुझ पर अपनी कृपा बनाए रखूँ। हरि स्मरण करता रह।`;

    res.json({ 
      reply: finalMessage,
      youtube: youtubeLink
    });

  } catch (error) {
    console.error('❌ Error during /chat processing:', error.response?.data || error.message);
    res.status(500).json({ error: 'Something went wrong during chat generation.' });
  }
});

export default router;