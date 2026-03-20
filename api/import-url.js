import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'

const DIMENSIONS = [
  { key: 'minimal_decorative',        left: 'Minimal',      right: 'Decorative'    },
  { key: 'bold_subtle',               left: 'Bold',         right: 'Subtle'        },
  { key: 'playful_formal',            left: 'Playful',      right: 'Formal'        },
  { key: 'emotional_rational',        left: 'Emotional',    right: 'Rational'      },
  { key: 'approachable_aspirational', left: 'Approachable', right: 'Aspirational'  },
  { key: 'rebellion_authority',       left: 'Rebellion',    right: 'Authority'     },
  { key: 'mass_niche',                left: 'Mass',         right: 'Niche'         },
  { key: 'innovation_craft',          left: 'Innovation',   right: 'Craft'         },
  { key: 'broad_focused',             left: 'Broad',        right: 'Focused'       },
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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'Missing url' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' })

  const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
  const SUPPORTED_MIME = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'video/quicktime', 'video/webm',
  ])

  // Guess MIME from URL extension or ?format= param as fallback for CDNs that send octet-stream
  function mimeFromUrl(u) {
    const extMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                     webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
                     mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' }
    // Check ?format= or &format= query param first (e.g. cosmos.so ?format=jpeg)
    const fmt = u.match(/[?&]format=([a-z0-9]+)/i)?.[1]?.toLowerCase()
    if (fmt && extMap[fmt]) return extMap[fmt]
    // Fall back to file extension
    const ext = u.split('?')[0].split('.').pop()?.toLowerCase()
    return extMap[ext] || null
  }

  try {
    // 1. Fetch bytes — send browser-like headers to avoid hotlink blocks (Savee, Dribbble, etc.)
    const imgRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': new URL(url).origin + '/',
      },
    })
    if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`)
    const buffer    = await imgRes.arrayBuffer()
    let imageBuffer = Buffer.from(buffer)

    // Some CDNs return application/octet-stream — fall back to URL extension
    let mimeType = (imgRes.headers.get('content-type') || '').split(';')[0].trim()
    if (!mimeType || mimeType === 'application/octet-stream') {
      mimeType = mimeFromUrl(url) || 'image/jpeg'
    }

    if (!SUPPORTED_MIME.has(mimeType)) {
      return res.status(400).json({ error: `Format not supported: ${mimeType}` })
    }

    // 2. Tag with Claude — skip for video; convert AVIF → JPEG first
    // Use claude-haiku for speed (stays well within Vercel's 10s timeout)
    let tags = {}
    if (!VIDEO_MIME.has(mimeType)) {
      let tagBuffer = imageBuffer
      let tagMime   = mimeType

      if (mimeType === 'image/avif') {
        imageBuffer = await sharp(imageBuffer)
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer()
        tagBuffer   = imageBuffer
        tagMime     = 'image/jpeg'
        mimeType    = 'image/jpeg'
      } else {
        // Cap non-AVIF images too to keep response under Vercel's 4.5MB limit
        imageBuffer = await sharp(imageBuffer)
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .toBuffer()
        tagBuffer = imageBuffer
      }

      const client   = new Anthropic({ apiKey })
      const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: tagMime, data: tagBuffer.toString('base64') } },
            { type: 'text', text: PROMPT },
          ],
        }],
      })
      tags = JSON.parse(response.content[0].text)
    }

    const imageData = imageBuffer.toString('base64')
    return res.status(200).json({ tags, imageData, mimeType })
  } catch (err) {
    console.error('import-url error:', err)
    return res.status(500).json({ error: err.message })
  }
}
