import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const docType = formData.get('type') as string || 'brand_guide'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  // Detect actual media type from file
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)

  if (!isPDF && !isImage) {
    return NextResponse.json({
      error: 'Please upload a PDF or image file (JPG, PNG, WebP). Word documents are not supported — please convert to PDF first.'
    }, { status: 400 })
  }

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

  const prompt = docType === 'sop' ? sopPrompt : brandPrompt

  try {
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
      // Image — use image block
      const imgMediaType = file.type.startsWith('image/') ? file.type : 'image/jpeg'
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
    console.error('Extraction error:', err)
    return NextResponse.json({ error: err.message || 'Extraction failed' }, { status: 500 })
  }
}
