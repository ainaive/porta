import { asc } from 'drizzle-orm'
import { getTranslations } from 'next-intl/server'
import { ConfirmButton } from '@/components/admin/confirm-button'
import { NativeSelect } from '@/components/admin/native-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { db } from '@/db'
import { user } from '@/db/schema'
import { setUserRole, toggleUserBan } from '@/lib/admin-actions'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const session = await requireAdmin()
  const [t, rows] = await Promise.all([
    getTranslations('admin'),
    db.select().from(user).orderBy(asc(user.createdAt)),
  ])

  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight">{t('users')}</h1>

      <div className="mt-6 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead className="w-64" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isSelf = row.id === session.user.id
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.name}
                    {row.banned ? (
                      <Badge variant="destructive" className="ml-2">
                        {t('banned')}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.email}
                  </TableCell>
                  <TableCell>
                    {isSelf ? (
                      <span>{row.role}</span>
                    ) : (
                      <form
                        action={setUserRole.bind(null, row.id)}
                        className="flex items-center gap-2"
                      >
                        <NativeSelect
                          name="role"
                          defaultValue={row.role ?? 'member'}
                          className="h-8 w-28"
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </NativeSelect>
                        <Button type="submit" size="sm" variant="outline">
                          {t('save')}
                        </Button>
                      </form>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isSelf ? (
                      <div className="flex justify-end">
                        <ConfirmButton
                          action={toggleUserBan.bind(null, row.id)}
                          confirmLabel={t('confirmDelete')}
                        >
                          {row.banned ? t('unban') : t('ban')}
                        </ConfirmButton>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
