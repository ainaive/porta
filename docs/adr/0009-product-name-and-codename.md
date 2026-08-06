# 0009 — Product name 硅基生态平台 / Silicon Ecosystem, with `porta` retained as the codename

- **Status**: accepted
- **Date**: 2026-08-06

## Context

The site shipped as "Porta" in both locales — Latin for *gate*, chosen to suit
a portal. The product is being renamed to **硅基生态平台**, and the English side
had to be decided alongside it.

`porta` is not only the displayed name. It is the GitHub repository, the npm
package name, module paths, and the three database names (`porta`,
`porta_test`, `porta_e2e`).

Separately, `common.appName` had existed in both message files since the first
commit but only the footer read it; the header wordmark, the page title
template, and the landing preview's sidebar each carried their own literal.

## Decision

- **The English name is "Silicon Ecosystem", not a literal translation.** The
  literal rendering is "Silicon-based Ecosystem Platform", which is a
  description rather than a name: four words, and in English "silicon-based"
  reads as materials science, losing the 硅基/碳基 machine-versus-human sense
  the term carries in Chinese. "Silicon Ecosystem" keeps 硅基生态 and drops only
  平台, the least distinctive element. The two names are a bilingual pair in
  the 飞书/Lark sense — each locale's name stands on its own.
- **The name lives in `common.appName` and nowhere else.** All four rendering
  surfaces read the key. Copy that needs the name inside a sentence — the
  three auth descriptions — takes an ICU `{appName}` placeholder rather than
  baking it in, so a future rename stays a two-line edit.
- **`porta` stays as the codename.** Repository, package, module paths and
  database names keep it. Renaming the databases would be a data migration
  with no user-visible benefit; renaming the repository would break every
  existing clone's remote. A product name and a codename diverging is normal,
  so `porta` in infrastructure beside 硅基生态平台 in the UI is correct rather
  than a leftover. Recorded in CONTEXT.md so nobody re-derives it.
- **Seeded fixtures were rebranded** (`silicon-cli`,
  `getting-started-with-silicon`). They are dev and e2e fixtures, but a freshly
  seeded catalog that still says "Porta CLI" contradicts the site around it.

Rejected: keeping "Porta" as the English half of a bilingual pair (cheapest —
no auth copy, no fixtures, no test churn — but the brief was to update the
English name too); translating literally to "Silicon-based Ecosystem Platform"
(a spec line, and 26 characters is unusable as a wordmark); renaming the
databases and repository (migration and breakage for no user-visible gain).

## Consequences

- The English name is two common nouns, so it is generic and not
  distinctive — acceptable for an internal employee portal, where
  discoverability is not the job, but it will never be a searchable brand.
- The header wordmark no longer renders below `sm`. "Silicon Ecosystem" needs
  roughly 395px in a 390px bar once the hamburger, locale toggle and sign-in
  button are counted; the brand mark alone identifies the site on a phone.
- The English hero line "One portal," loses its wordplay on *Porta*. It still
  reads as a common noun, and the Chinese 一个入口 was never tied to the name,
  so both stand.
- 硅基生态**平台** now sits above the kicker 生态工具链**门户**, repeating 生态 and
  setting 平台 against 门户. Left alone: the name is the name and the kicker is
  the positioning. If it reads redundant on screen, change the kicker.
- ADRs 0001–0008 still say "Porta" and are deliberately not edited — they are
  historical records, and 0008's "Porta Landing v3" is a real design filename.
