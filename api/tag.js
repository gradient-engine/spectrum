import Anthropic from '@anthropic-ai/sdk'

const DIMENSIONS = [
  { key: 'minimal_decorative',       left: 'Minimal',      right: 'Decorative'    },
  { key: 'bold_subtle',              left: 'Bold',         right: 'Subtle'        },
  { key: 'playful_formal',           left: 'Playful',      right: 'Formal'        },
  { key: 'emotional_rational',       left: 'Emotional',    right: 'Rational'      },
  { key: 'approachable_aspirational',left: 'Approachable', right: 'Aspirational'  },
  { key: 'rebellion_authority',      left: 'Rebellion',    right: 'Authority'     },
  { key: 'mass_niche',               left: 'Mass',         right: 'Niche'         },
  { key: 'innovation_craft',         left: 'Innovation',   right: 'Craft'         },
  { key: 'broad_focused',            left: 'Broad',        right: 'Focused'       },
]

const PROMPT = `You are a brand strategist and creative director. Analyze this image and score it on 9 brand personality dimensions.

For each dimension, assign a score from -3 to +3 where:
  -3 = strongly embodies the LEFT quality
   0 = neutral / balanced / not applicable
  +3 = strongly embodies the RIGHT quality

Only use integer values: -3, -2, -1, 0, 1, 2, 3.

Dimensions:
${DIMENSIONS.map(d => `- ${d.key}: ${d.left} (-3) ↔ ${d.right} (+3)`).join('\n')}

Respond ONLY with a valid JSON object. No explanation, no markdown, just JSON. Example:
{"minimal_decorative": 2, "bold_subtle": -1, "playful_formal": 0, "emotional_rational": 1, "approachable_aspirational": 2, "rebellion_authority": -1, "mass_niche": 1, "innovation_craft": 0, "broad_focused": -1}`

export default async function handler(req, res) {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageData, mimeType } = req.body

  if (!imageData || !mimeType) {
    return res.status(400).json({ error: 'Missing imageData or mimeType' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment variables' })
  }

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } },
          { type: 'text', text: PROMPT },
        ],
      }],
    })

    const tags = JSON.parse(response.content[0].text)
    return res.status(200).json(tags)
  } catch (err) {
    console.error('Tagging error:', err)
    return res.status(500).json({ error: err.message })
  }
}
