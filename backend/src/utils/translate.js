import fetch from 'node-fetch';
import prisma from '../db.js';

export async function translateText(text, targetLang) {
  if (!text) return '';
  try {
    const apiSettings = await prisma.apiSettings.findUnique({ where: { id: 'singleton' } });
    const apiKey = apiSettings?.googleTranslateKey;
    if (!apiKey) return text;

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        format: 'text'
      })
    });

    const data = await response.json();
    if (data.error) {
       console.error('Translate API Error:', data.error.message);
       return text;
    }
    
    return data.data.translations[0].translatedText;
  } catch (err) {
    console.error('Translation error:', err);
    return text;
  }
}

export async function autoTranslateFields(data, fields) {
  for (const field of fields) {
    if (data[field]) {
      const text = data[field];
      data[`${field}En`] = await translateText(text, 'en');
      data[`${field}Ru`] = await translateText(text, 'ru');
    }
  }
}
