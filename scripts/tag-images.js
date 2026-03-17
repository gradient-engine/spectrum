#!/usr/bin/env node
/**
 * Spectrum — Image Tagger
 *
 * Reads images from public/images/, scores each on 9 brand dimensions using
 * Claude vision, and writes results to src/metadata.json.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/tag-images.js
 *
 * Options:
 *   --force   Re-tag images already in metadata.json
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const IMAGES_DIR = path.join(ROOT, 'public', 'images')
const METADATA_FILE = path.join(ROOT, 'src', 'metadata.json')

const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const FORCE = process.argv.includes('--force')

const DIMENSIONS = [
  { key: 'minimal_decorative', left: 'Minimal', right: 'Decorative' },
  { key: 'bold_subtle', left: 'Bold', right: 'Subtle' },
  { key: 'playful_formal', left: 'Playful', right: 'Formal' },
  { key: 'emotional_rational', left: 'Emotional', right: 'Rational' },
  { key: 'approachable_aspirational', left: 'Approachable', right: 'Aspirational' },
  { key: 'rebellion_authority', left: 'Rebellion', right: 'Authority' },
  { key: 'mass_niche', left: 'Mass', right: 'Niche' },
  { key: 'innovation_craft', left: 'Innovation', right: 'Craft' },
  { key: 'broad_focused', left: 'Broad', right: 'Focused' },
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

function getMimeType(ext) {
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }
  return map[ext] || 'image/jpeg'
}

async function tagImage(client, filename) {
  const filePath = path.join(IMAGES_DIR, filename)
  const ext = path.extname(filename).toLowerCase()
  const mimeType = getMimeType(ext)
  const imageData = fs.readFileSync(filePath).toString('base64')

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageData },
          },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  })

  const text = response.content[0].text.trim()
  // Strip any accidental markdown fences
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const scores = JSON.parse(clean)

  // Validate all keys present and values are integers in [-3, 3]
  for (const { key } of DIMENSIONS) {
    if (!(key in scores)) throw new Error(`Missing key: ${key}`)
    const v = scores[key]
    if (!Number.isInteger(v) || v < -3 || v > 3) throw new Error(`Invalid value for ${key}: ${v}`)
  }

  return scores
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.')
    process.exit(1)
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true })
    console.log(`Created ${IMAGES_DIR}. Add images and re-run.`)
    process.exit(0)
  }

  const allFiles = fs.readdirSync(IMAGES_DIR)
  const images = allFiles.filter(f => SUPPORTED_EXTS.includes(path.extname(f).toLowerCase()))

  if (images.length === 0) {
    console.log(`No images found in ${IMAGES_DIR}`)
    process.exit(0)
  }

  // Load existing metadata
  let metadata = {}
  if (fs.existsSync(METADATA_FILE)) {
    try {
      metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'))
    } catch {
      metadata = {}
    }
  }

  const toTag = FORCE ? images : images.filter(f => !metadata[f])
  const skipped = images.length - toTag.length

  if (toTag.length === 0) {
    console.log(`All ${images.length} images already tagged. Use --force to re-tag.`)
    process.exit(0)
  }

  console.log(`Found ${images.length} images. Tagging ${toTag.length} (${skipped} already done)...\n`)

  const client = new Anthropic()
  let success = 0
  let errors = 0

  for (let i = 0; i < toTag.length; i++) {
    const filename = toTag[i]
    process.stdout.write(`[${i + 1}/${toTag.length}] ${filename} ... `)
    try {
      const scores = await tagImage(client, filename)
      metadata[filename] = scores
      // Save after each image so progress isn't lost on interruption
      fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2))
      console.log('✓')
      success++
    } catch (err) {
      console.log(`✗ ${err.message}`)
      errors++
    }
  }

  console.log(`\nDone. ${success} tagged, ${errors} failed.`)
  console.log(`Metadata saved to: ${METADATA_FILE}`)
}

main()
