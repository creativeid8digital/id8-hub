import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const maxDuration = 60

const brandPrompt = `This is a brand guide document. Extract ALL brand information you can find.
Return ONLY valid JSON (no markdown, no explanation, just the JSON object):
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
Return ONLY valid JSON (no markdown):
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

    if (!file) return NextResponse.json({ error: 'No file received. Please try again.' }, { status: 400 })

    const fileName = (file.name || '').toLowerCase()
    const mimeType = (file.type || '').toLowerCase()
    const fileSizeMB = file.size / (1024 * 1024)

    // Log for debugging
    console.log('Extract brand:', { fileName, mimeType, fileSizeMB: fileSizeMB.toFixed(2), docType })

    if (fileSizeMB > 15) {
      return NextResponse.json({
        error: `File is ${fileSizeMB.toFixed(1)}MB — too large. Please compress the PDF or export just the key pages (5-10 pages is enough for AI to extract brand info).`
      }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Determine if PDF or image — check everything
    const looksLikePDF =
      mimeType === 'application/pdf' ||
      mimeType.includes('pdf') ||
      fileName.endsWith('.pdf')

    const looksLikeImage =
      mimeType.startsWith('image/') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.webp') ||
      fileName.endsWith('.gif')

    // If we truly can't tell, assume PDF (most brand guides are PDFs)
    const treatAsPDF = looksLikePDF || (!looksLikeImage)

    const prompt = docType === 'sop' ? sopPrompt : brandPrompt

    let messageContent: any[]

    if (treatAsPDF && !looksLikeImage) {
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        { type: 'text', text: prompt },
      ]
    } else {
      // Image
      let imgType = 'image/jpeg'
      if (mimeType.startsWith('image/')) imgType = mimeType
      else if (fileName.endsWith('.png')) imgType = 'image/png'
      else if (fileName.endsWith('.webp')) imgType = 'image/webp'
      else if (fileName.endsWith('.gif')) imgType = 'image/gif'

      messageContent = [
        {
          type: 'image',
          source: { type: 'base64', media_type: imgType, data: base64 },
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
    console.log('AI response preview:', text.slice(0, 200))

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI did not return valid JSON. Please try again.')
    const extracted = JSON.parse(jsonMatch[0])

    return NextResponse.json({ extracted })
  } catch (err: any) {
    console.error('Extraction error:', err?.message || err)
    if (err?.status === 400 && err?.message?.includes('Could not process')) {
      return NextResponse.json({ error: 'AI could not read this file. Try a different PDF or take a screenshot of the brand guide and upload as an image.' }, { status: 400 })
    }
    return NextResponse.json({
      error: err?.message || 'Extraction failed. Please try again or fill the manual manually.'
    }, { status: 500 })
  }
}
