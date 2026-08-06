'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

type SignUpInput = Parameters<typeof authClient.signUp.email>[0] & {
  inviteToken?: string
}

export function SignUpForm({
  inviteToken,
  lockedEmail,
}: {
  inviteToken?: string
  lockedEmail?: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    const { error } = await authClient.signUp.email({
      name: String(form.get('name')),
      email: lockedEmail ?? String(form.get('email')),
      password: String(form.get('password')),
      // Extra field consumed by the server-side invite hook.
      inviteToken,
    } as SignUpInput)
    setPending(false)
    if (error) {
      toast.error(error.message ?? 'Sign-up failed')
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={lockedEmail ?? undefined}
            disabled={Boolean(lockedEmail)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </FieldGroup>
    </form>
  )
}
