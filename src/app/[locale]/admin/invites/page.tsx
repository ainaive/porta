import { desc } from 'drizzle-orm'
import { getFormatter, getTranslations } from 'next-intl/server'
import { ConfirmButton } from '@/components/admin/confirm-button'
import { CopyLinkButton } from '@/components/admin/copy-link-button'
import { InviteForm } from '@/components/admin/invite-form'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { db } from '@/db'
import { invites } from '@/db/schema'
import { deleteInvite } from '@/lib/admin-actions'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function AdminInvitesPage() {
  await requireAdmin()
  const [t, format, rows] = await Promise.all([
    getTranslations('admin'),
    getFormatter(),
    db.select().from(invites).orderBy(desc(invites.createdAt)),
  ])

  function statusOf(invite: (typeof rows)[number]) {
    if (invite.usedAt)
      return { label: t('statusUsed'), variant: 'secondary' as const }
    if (invite.expiresAt < new Date())
      return { label: t('statusExpired'), variant: 'outline' as const }
    return { label: t('statusActive'), variant: 'default' as const }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t('invites')}</h1>
      <div className="mt-6">
        <InviteForm />
      </div>

      <div className="mt-6 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('expiresAt')}</TableHead>
              <TableHead className="w-56" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((invite) => {
              const status = statusOf(invite)
              const active = !invite.usedAt && invite.expiresAt >= new Date()
              return (
                <TableRow key={invite.id}>
                  <TableCell>
                    {invite.email ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invite.role}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format.dateTime(invite.expiresAt, {
                      dateStyle: 'medium',
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {active ? <CopyLinkButton token={invite.token} /> : null}
                      {!invite.usedAt ? (
                        <ConfirmButton
                          action={deleteInvite.bind(null, invite.id)}
                          confirmLabel={t('confirmRevoke')}
                        >
                          {t('revoke')}
                        </ConfirmButton>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  —
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
