/**
 * Image Generator — Gemini AI
 * Generates placeholder city/territory images for transport slides
 */

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

/**
 * Generate an AI city photo placeholder
 * @param {string} city - City name in France
 * @param {string} subject - Subject description (e.g. "gare, transports en commun")
 * @returns {Promise<string|null>} data URI (data:image/png;base64,...) or null
 */
export async function generateCityImage(city, subject = 'vue aérienne du quartier') {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return null;

  const prompt = `Professional architectural photography of ${city}, France. ${subject}. Daytime, warm natural lighting, high resolution real estate report style, beautiful French city, detailed and realistic.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[ImageGen] HTTP ${res.status}:`, errText.substring(0, 200));
      return null;
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (imgPart?.inlineData?.data) {
      return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
    }

    console.warn('[ImageGen] No image part in response');
  } catch (e) {
    console.warn('[ImageGen] Error:', e.message);
  }
  return null;
}
