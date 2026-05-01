import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { task_id } = await req.json()

  // Get task with brief and brand
  const { data: task } = await admin.from('tasks')
    .select('*, brands(id, name, color), briefs(title, description)')
    .eq('id', task_id).single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (!task.drive_file_url) return NextResponse.json({ error: 'No file uploaded yet. Please upload your creative first.' }, { status: 400 })

  // Get brand manual if exists
  let brandManual = null
  if (task.brand_id) {
    const { data } = await admin.from('brand_manual').select('*').eq('brand_id', task.brand_id).maybeSingle()
    brandManual = data
  }

  // Check if the file is an image we can analyse
  const imageUrl = task.drive_file_url
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(imageUrl)

  if (!isImage) {
    return NextResponse.json({
      critique: [{
        check: 'File Format',
        status: 'info',
        message: 'AI critique works best with image files (JPG, PNG, WebP). For PDFs or videos, please also upload a screenshot of the key frame.',
      }],
      summary: 'Upload an image file for full AI analysis.',
      canSubmit: true,
    })
  }

  // Build the prompt with all brand manual context
  const brandContext = brandManual ? `
BRAND MANUAL FOR ${(task.brands as any)?.name?.toUpperCase()}:
- Primary Colour: ${brandManual.primary_color || (task.brands as any)?.color || 'Not specified'}
- Secondary Colour: ${brandManual.secondary_color || 'Not specified'}
- Accent Colour: ${brandManual.accent_color || 'Not specified'}
- Forbidden Colours: ${brandManual.forbidden_colors || 'None specified'}
- Primary Font: ${brandManual.primary_font || 'Not specified'}
- Secondary Font: ${brandManual.secondary_font || 'Not specified'}
- Font Rules: ${brandManual.font_notes || 'None specified'}
- Brand IS: ${(brandManual.tone_words || []).join(', ') || 'Not specified'}
- Brand is NEVER: ${(brandManual.anti_tone_words || []).join(', ') || 'Not specified'}
- Target Audience: ${brandManual.target_age || ''} ${brandManual.target_gender || ''} — ${brandManual.target_interests || 'Not specified'}
- Active Platforms: ${(brandManual.active_platforms || []).join(', ') || 'Not specified'}
- ALWAYS DO: ${brandManual.dos || 'None specified'}
- NEVER DO: ${brandManual.donts || 'None specified'}
- Competitors to avoid looking like: ${brandManual.competitors || 'None specified'}
` : `
BRAND INFO:
- Brand Name: ${(task.brands as any)?.name || 'Not specified'}
- Brand Colour: ${(task.brands as any)?.color || 'Not specified'}
- Note: No complete brand manual has been set up yet. Doing a general critique.
`

  const briefContext = `
BRIEF / JOB DESCRIPTION:
- Task: ${task.title}
- Description: ${task.description || (task.briefs as any)?.description || 'No brief provided'}
`

  const systemPrompt = `You are a senior creative director at a top advertising agency. You are critiquing a creative submitted for approval. Be direct, specific, and helpful. Not overly harsh but not sugarcoating either. Your job is to catch issues before the Creative Head sees the work.

Return your response as a JSON object with this exact structure:
{
  "checks": [
    {
      "check": "Check name",
      "status": "pass" | "fail" | "warn" | "info",
      "message": "Specific, actionable feedback"
    }
  ],
  "overall_score": 1-10,
  "summary": "One sentence overall assessment",
  "top_fix": "The single most important thing to fix before submitting",
  "can_submit": true | false
}

Status meanings:
- pass: Looks good
- warn: Minor issue, can still submit but should fix  
- fail: Must fix before submitting
- info: Informational observation

can_submit should be false if any check has status "fail".`

  const userPrompt = `Please critique this creative against the brand guidelines and brief.

${brandContext}
${briefContext}

Analyse the image and check:
1. Brand colour usage — are the correct brand colours present?
2. Text readability — is all text clearly readable with good contrast?
3. Logo/brand mark — is it visible and properly placed?
4. Copy alignment — does the visual and any text match what the brief asked for?
5. Tone — does this feel like it matches the brand personality (${(brandManual?.tone_words || []).join(', ') || 'brand tone not defined'})?
6. Image dimensions/format — are there any obvious proportion issues for digital use?
7. Prohibited elements — do you see anything that violates the "never do" rules?
8. Overall quality — professional finish, no obvious errors?

Give specific, actionable feedback for each check.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          { type: 'text', text: userPrompt },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const result = JSON.parse(jsonMatch[0])

    // Save critique to DB for reference
    await admin.from('tasks').update({
      drive_file_url: task.drive_file_url, // keep the file
    }).eq('id', task_id)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('AI critique error:', err)
    return NextResponse.json({ error: 'AI critique failed: ' + err.message }, { status: 500 })
  }
}
