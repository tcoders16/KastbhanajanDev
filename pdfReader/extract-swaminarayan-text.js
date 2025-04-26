const fs = require('fs');
const pdf = require('pdf-parse');

const inputPath = './Swaminarayan.pdf';
const outputPath = './Swaminarayan.txt';

(async () => {
  try {
    const dataBuffer = fs.readFileSync(inputPath);
    const data = await pdf(dataBuffer);
    fs.writeFileSync(outputPath, data.text, 'utf-8');
    console.log(`✅ Extracted text from Swaminarayan.pdf`);
    console.log(`📄 Saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to extract PDF text:', error.message);
  }
})();