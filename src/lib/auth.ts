import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function getAdminEmails(): Promise<string[]> {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) return ['kunal@id8.digital']
    const { data } = await admin.from('admin_config').select('value').eq('key', 'admin_emails').single()
    return (data?.value as string[]) ?? ['kunal@id8.digital']
  } catch {
    return ['kunal@id8.digital']
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      try {
        const admin = getSupabaseAdmin()
        if (!admin) return true
        const adminEmails = await getAdminEmails()
        const isAdmin = adminEmails.includes(user.email)
        await admin.from('users').upsert(
          { email: user.email, name: user.name, avatar_url: user.image, is_admin: isAdmin },
          { onConflict: 'email' }
        )
      } catch (e) {
        console.error('signIn error:', e)
      }
      return true
    },
    async session({ session }) {
      if (!session.user?.email) return session
      try {
        const admin = getSupabaseAdmin()
        if (!admin) return session
        const { data } = await admin
          .from('users')
          .select('id, agency_role, is_admin, onboarding_complete')
          .eq('email', session.user.email)
          .single()
        if (data) {
          const u = session.user as any
          u.id = data.id
          u.agency_role = data.agency_role
          u.is_admin = data.is_admin
          u.onboarding_complete = data.onboarding_complete
        }
      } catch (e) {
        console.error('session error:', e)
      }
      return session
    },
    async jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token
      return token
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
}
