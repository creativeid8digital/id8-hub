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

  // Convert to base64
  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = file.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg'

  const prompt = docType === 'sop'
    ? `This is an agency SOP / guidelines document. Extract:
1. Rules for what to always do (dos)
2. Rules for what to never do (don'ts)
3. Any tone or voice guidelines
4. Any platform-specific rules

Return ONLY valid JSON with this structure:
{
  "dos": "bullet points of rules as a single string",
  "donts": "bullet points of rules as a single string",
  "brand_voice_notes": "any tone/voice guidelines",
  "platform_notes": "any platform-specific rules",
  "font_notes": "any typography rules"
}`
    : `This is a brand guide document. Extract ALL brand information you can find:
- Brand tagline
- Industry/sector
- Website
- Primary colour (hex code)
- Secondary colour (hex code)
- Accent colour (hex code)
- Forbidden/banned colours
- Primary font name
- Secondary font name
- Font rules/notes
- Brand tone words (words that describe the brand)
- Words the brand should never be
- Brand voice notes
- Target age range
- Target gender
- Target interests/psychographics
- Target market/geography
- Active social platforms
- Platform-specific notes
- Things to always do
- Things to never do
- Competitor brands

Return ONLY valid JSON with this exact structure (use null for missing fields):
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

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          } as any,
          { type: 'text', text: prompt },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in AI response')
    const extracted = JSON.parse(jsonMatch[0])

    return NextResponse.json({ extracted, confidence: 'high' })
  } catch (err: any) {
    return NextResponse.json({ error: 'Extraction failed: ' + err.message }, { status: 500 })
  }
}
