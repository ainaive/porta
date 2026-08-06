import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { invites, user } from '@/db/schema'

export type Invite = typeof invites.$inferSelect

export async function findValidInvite(token: string): Promise<Invite | null> {
  const [invite] = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.token, token),
        isNull(invites.usedAt),
        gt(invites.expiresAt, new Date()),
      ),
    )
    .limit(1)
  return invite ?? null
}

export async function hasAnyUser(): Promise<boolean> {
  return (await db.$count(user)) > 0
}
