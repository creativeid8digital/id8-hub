import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export type Brand = {
  id: string
  name: string
  color: string
  drive_folder_url: string | null
  created_at: string
}

export type Campaign = {
  id: string
  title: string
  brand_id: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  team: string
  due_date: string | null
  drive_folder_url: string | null
  description: string | null
  created_by: string
  created_at: string
  brands?: Brand
}

export type SocialPost = {
  id: string
  brand_id: string
  title: string
  platform: string
  post_type: string
  scheduled_date: string
  status: 'planned' | 'in_progress' | 'review' | 'approved' | 'published'
  assigned_to: string | null
  drive_file_url: string | null
  notes: string | null
  brands?: Brand
}

export type Brief = {
  id: string
  title: string
  brand_id: string
  team: string
  status: 'not_started' | 'in_progress' | 'review' | 'approved'
  due_date: string | null
  drive_file_url: string | null
  description: string | null
  brands?: Brand
}

export type Approval = {
  id: string
  title: string
  brand_id: string
  campaign_id: string | null
  current_stage: 'creative' | 'account_manager' | 'client'
  creative_approved: boolean
  am_approved: boolean
  client_approved: boolean
  drive_file_url: string | null
  notes: string | null
  brands?: Brand
}

export type PerformanceCampaign = {
  id: string
  name: string
  brand_id: string
  platform: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  roas: number
  status: 'live' | 'paused' | 'ended' | 'review'
  month_year: string
  brands?: Brand
}

export type DevTask = {
  id: string
  title: string
  brand_id: string | null
  sprint_name: string | null
  status: 'backlog' | 'in_dev' | 'qa' | 'deployed'
  task_type: string
  due_date: string | null
  assigned_to: string | null
  brands?: Brand
}
