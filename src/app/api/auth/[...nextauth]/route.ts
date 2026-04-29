import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabase } from '@/lib/supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Upsert user into our Supabase users table on every login
      if (user.email) {
        await supabase.from('users').upsert(
          { email: user.email, name: user.name, avatar_url: user.image },
          { onConflict: 'email' }
        )
      }
      return true
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const { data } = await supabase
          .from('users')
          .select('id, team, role')
          .eq('email', session.user.email)
          .single()
        if (data) {
          ;(session.user as any).id = data.id
          ;(session.user as any).team = data.team
          ;(session.user as any).role = data.role
        }
      }
      return session
    },
    async jwt({ token, account }) {
      if (account) token.accessToken = account.access_token
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
