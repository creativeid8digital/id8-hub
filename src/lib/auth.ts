import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAdminEmails(): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin
      .from('admin_config')
      .select('value')
      .eq('key', 'admin_emails')
      .single()
    return (data?.value as string[]) ?? ['kunal@id8.digital']
  } catch {
    return ['kunal@id8.digital']
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      const adminEmails = await getAdminEmails()
      const isAdmin = adminEmails.includes(user.email)
      await supabaseAdmin.from('users').upsert(
        {
          email: user.email,
          name: user.name,
          avatar_url: user.image,
          is_admin: isAdmin,
        },
        { onConflict: 'email' }
      )
      return true
    },
    async session({ session }) {
      if (!session.user?.email) return session
      const { data } = await supabaseAdmin
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
