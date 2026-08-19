'use client'

import { useTranslations } from 'next-intl'
import { NativeSelect } from '@/components/admin/native-select'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { MetaField } from '@/core/module/define'

// Renders a section's type-specific fields from the descriptors its module
// registered. Adding a field to a module therefore needs no change here and
// no key in the core message files — the label resolves in the module's own
// namespace.
export function MetaFields({
  moduleId,
  fields,
  values,
}: {
  moduleId: string
  fields: readonly MetaField[]
  /** Current value per field name, already stringified for the input. */
  values: Record<string, string>
}) {
  const t = useTranslations()
  if (fields.length === 0) return null

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {fields.map((field) => (
        <Field
          key={field.name}
          className={field.span === 'full' ? 'sm:col-span-2' : undefined}
        >
          <FieldLabel htmlFor={field.name}>
            {t(`${moduleId}.${field.labelKey}`)}
          </FieldLabel>
          <MetaInput field={field} value={values[field.name] ?? ''} />
        </Field>
      ))}
    </div>
  )
}

function MetaInput({ field, value }: { field: MetaField; value: string }) {
  switch (field.kind) {
    case 'select':
      return (
        <NativeSelect id={field.name} name={field.name} defaultValue={value}>
          {field.emptyOption ? <option value="">—</option> : null}
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      )
    case 'lines':
      return (
        <Textarea
          id={field.name}
          name={field.name}
          rows={4}
          defaultValue={value}
          className={field.mono ? 'font-mono text-sm' : undefined}
        />
      )
    case 'number':
      return (
        <Input
          id={field.name}
          name={field.name}
          type="number"
          min={field.min}
          step={field.step}
          defaultValue={value}
        />
      )
    default:
      return (
        <Input
          id={field.name}
          name={field.name}
          defaultValue={value}
          placeholder={field.placeholder}
        />
      )
  }
}
