import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askJson(prompt) {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }]
  });
  return JSON.parse(response.choices[0].message.content);
}

export async function askText(prompt) {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.55,
    messages: [{ role: 'user', content: prompt }]
  });
  return response.choices[0].message.content.trim();
}
