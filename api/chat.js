export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ reply: 'Error: API key no configurada.' });

  const systemPrompt = `Eres Élise, una personal shopper experta y sofisticada especializada en moda española.

FLUJO OBLIGATORIO:
PASO 1 — Saluda y pregunta en UN mensaje: género, ocasión, estilo, presupuesto en €, talla y tiendas favoritas (Zara, Mango, H&M, Stradivarius, Pull&Bear, Primark, Massimo Dutti, ASOS).
PASO 2 — Con todos los datos recomienda outfit de 5 prendas. El TOTAL nunca supera el presupuesto.

FORMATO por prenda:
👗 [Prenda] — [Marca]
Color: [descripción]
Precio aprox: [X]€
🔗 [Buscar](https://www.google.com/search?q=PRENDA+COLOR+MARCA+españa&tbm=shop)

Al final: 💰 Total, ✨ por qué funciona, 💡 alternativa económica.
Responde SIEMPRE en español. Tono cercano y entusiasta.`;

  try {
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
        })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return res.status(500).json({ reply: `Error Gemini: ${data.error?.message || 'desconocido'}` });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('No text in response:', JSON.stringify(data));
      return res.status(500).json({ reply: 'No se recibió respuesta del modelo.' });
    }

    res.status(200).json({ reply: text });
  } catch (err) {
    console.error('Catch error:', err.message);
    res.status(500).json({ reply: `Error: ${err.message}` });
  }
}
