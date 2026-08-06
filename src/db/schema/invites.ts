import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'

// Signup is invite-only: an admin creates an invite and shares the tokenized
// sign-up link. Enforcement lives in the better-auth sign-up hook, not the UI.
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  // When set, the invite can only be redeemed by this email address.
  email: text('email'),
  role: text('role').notNull().default('member'),
  invitedBy: text('invited_by')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  usedBy: text('used_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
