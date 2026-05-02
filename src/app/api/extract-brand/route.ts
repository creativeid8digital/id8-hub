import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60 // 60s timeout for large PDFs

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Increase body size limit to 20MB
export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }

const brandPrompt = `This is a brand guide document. Extract ALL brand information you can find.
Return ONLY valid JSON with this exact structure (use null for missing fields, empty arrays for missing lists):
{
  "tagline": null,
  "industry": null,
  "website": null,
  "primary_color": null,
  "secondary_color": null,
  "accent_color": null,
  "forbidden_colors": null,
  "primary_font": null,
  "secondary_font": null,
  "font_notes": null,
  "tone_words": [],
  "anti_tone_words": [],
  "brand_voice_notes": null,
  "target_age": null,
  "target_gender": null,
  "target_interests": null,
  "target_market": null,
  "active_platforms": [],
  "platform_notes": null,
  "dos": null,
  "donts": null,
  "competitors": null,
  "instagram_url": null,
  "linkedin_url": null,
  "twitter_url": null,
  "youtube_url": null,
  "facebook_url": null
}`

const sopPrompt = `This is an agency SOP or guidelines document. Extract rules and guidelines.
Return ONLY valid JSON:
{
  "dos": null,
  "donts": null,
  "brand_voice_notes": null,
  "platform_notes": null,
  "font_notes": null,
  "tone_words": [],
  "anti_tone_words": []
}`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const docType = (formData.get('type') as string) || 'brand_guide'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Check file size — Vercel limit is ~4.5MB for serverless
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 15) {
      return NextResponse.json({
        error: `File is ${fileSizeMB.toFixed(1)}MB — maximum is 15MB. Please compress the PDF or export just the key pages.`
      }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Detect file type more permissively
    const fileName = file.name?.toLowerCase() || ''
    const mimeType = file.type?.toLowerCase() || ''

    const isPDF = mimeType.includes('pdf') || fileName.endsWith('.pdf')
    const isImage = mimeType.startsWith('image/') ||
      fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') || fileName.endsWith('.webp')

    if (!isPDF && !isImage) {
      return NextResponse.json({
        error: `Unsupported file type "${file.type || fileName}". Please upload a PDF or image (JPG, PNG, WebP). Word docs should be saved as PDF first.`
      }, { status: 400 })
    }

    const prompt = docType === 'sop' ? sopPrompt : brandPrompt

    let messageContent: any[]

    if (isPDF) {
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        { type: 'text', text: prompt },
      ]
    } else {
      const imgMediaType = mimeType.startsWith('image/') ? mimeType : 'image/jpeg'
      messageContent = [
        {
          type: 'image',
          source: { type: 'base64', media_type: imgMediaType, data: base64 },
        },
        { type: 'text', text: prompt },
      ]
    }

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: messageContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse AI response')
    const extracted = JSON.parse(jsonMatch[0])

    return NextResponse.json({ extracted })
  } catch (err: any) {
    console.error('Extraction error:', err?.message || err)
    // Return specific error messages
    if (err?.message?.includes('413') || err?.message?.includes('too large')) {
      return NextResponse.json({ error: 'PDF too large. Please compress it or extract just the brand guidelines pages (usually 5-10 pages is enough).' }, { status: 400 })
    }
    return NextResponse.json({ error: err?.message || 'Extraction failed. Please try a smaller file.' }, { status: 500 })
  }
}
