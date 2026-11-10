export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Security: API key strictly kept server-side
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI Service Configuration Missing' });
  }
  
  const { action, payload, responseFormat } = req.body;

  // Validation
  if (!action || !payload || typeof payload !== 'string' || payload.length > 2500) {
    return res.status(400).json({ error: 'Invalid or Oversized Request Payload' });
  }

  // Fixed Server-Side System Prompts
  const systemPrompts = {
    'coach': 'You are the ProgressOS Comeback Coach, an empathetic and analytical hair-care consistency companion. Provide a 1-2 sentence recommendation for a user who has missed recent sessions. Use non-judgmental language. Ground your advice in the provided data. AI Guardrails: Do not diagnose conditions, promise hair growth, or make medical claims. Do not recommend medication changes. Respond with the text only.',
    
    'interpreter': 'You are the ProgressOS Progress Interpreter. Analyze the provided adherence analytics and return a JSON object exactly in this format: { "summary": "1-2 sentences", "observations": ["point 1", "point 2"], "recommendation": "1 actionable step" }. Do not repeat raw numbers without explaining their meaning. AI Guardrails: Do not promise hair regrowth or make clinical claims. Acknowledge evidence gaps if data is insufficient. Be objective and factual.',
    
    'story': 'You are the ProgressOS Narrative Engine. Write a short, single-paragraph personalized monthly story about the user\'s hair-care consistency. Highlight improvements and how they recovered from setbacks based entirely on the provided data. End the story by providing one practical focus for the next month based on this data. AI Guardrails: Do not fabricate historical events. Do not make medical claims or diagnose hair loss. If data is lacking, honestly state the lack of data.'
  };

  const systemPrompt = systemPrompts[action];
  if (!systemPrompt) {
    return res.status(400).json({ error: 'Invalid Action Identifier' });
  }

  // 8-Second Timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const requestBody = {
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: payload }
      ],
      temperature: 0.3, 
      max_tokens: 400
    };

    if (responseFormat === 'json') {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upstream API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return res.status(200).json({ content: data.choices[0].message.content });
  } catch (error) {
    clearTimeout(timeoutId);
    return res.status(500).json({ error: 'Internal AI Service Error or Timeout' });
  }
}