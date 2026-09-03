import { GoogleGenAI } from '@google/genai';

class GeminiService {
  constructor() {
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.client = null;
    this.isInitialized = false;
  }

  _initClient() {
    if (this.isInitialized) return true;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured. AI features will be disabled.');
      return false;
    }
    try {
      this.client = new GoogleGenAI({ apiKey });
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('Failed to initialize Gemini Client:', err);
      return false;
    }
  }

  /**
   * Generates a plain text response from Gemini.
   */
  async generateText(prompt, systemInstruction = '') {
    if (!this._initClient()) {
      throw new Error('AI xidməti konfiqurasiya edilməyib.');
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      });
      
      return response.text;
    } catch (error) {
      this._handleApiError(error);
    }
  }

  /**
   * Generates a structured JSON response from Gemini.
   */
  async generateStructured(prompt, systemInstruction = '', schema) {
    if (!this._initClient()) {
      throw new Error('AI xidməti konfiqurasiya edilməyib.');
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2, // Lower temp for more deterministic JSON
          maxOutputTokens: 4000,
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      });
      
      // Attempt to parse the response text as JSON
      const jsonStr = response.text;
      return JSON.parse(jsonStr);
    } catch (error) {
      this._handleApiError(error);
    }
  }

  _handleApiError(error) {
    // Strip sensitive details and throw a safe application error
    console.error('Gemini API Error occurred.'); // Do not log full error to avoid key leakage in some environments
    
    // Custom error throwing
    const safeError = new Error('AI xidməti hazırda cavab verə bilmir. Bir qədər sonra yenidən cəhd edin.');
    safeError.status = 502; // Bad Gateway
    safeError.code = 'AI_PROVIDER_ERROR';
    throw safeError;
  }
}

export const aiService = new GeminiService();
