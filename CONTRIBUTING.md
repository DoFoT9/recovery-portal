# Contributing to Recovery Portal

Thanks for your interest! A few notes before you dive in.

## Licensing of contributions

By submitting a pull request, you agree that your contributions are licensed under [PolyForm Small Business 1.0.0](LICENSE), the same licence as the rest of the project. You retain copyright in your contribution but grant the right for it to be incorporated and redistributed under the project licence.

## Development setup

```bash
git clone https://github.com/DoFoT9/recovery-portal.git
cd recovery-portal
cp .env.example .env.local
./scripts/init-secrets.sh
npm install
npm run dev
```

Open http://localhost:3000 — the dev server has hot reload.

## Pull request guidelines

1. **One PR per feature/fix** — keeps reviews focused
2. **Include a brief description** of what changes and why
3. **TypeScript strict mode** is on — no `any` without justification
4. **Match the existing UI conventions** — neutral palette, brand colour via CSS vars, `card`/`btn-primary`/`input` utility classes
5. **Migrations** must be idempotent (`IF NOT EXISTS`, column-exists checks)
6. **No breaking changes** to existing API routes without a major version bump

## Areas where help is welcome

- 🌐 Internationalisation (i18n)
- ♿ Accessibility audit + fixes (WCAG 2.2 AA)
- 🧪 Test coverage (currently low — anything is a win)
- 🎨 Rehab type / stage / milestone templates the community can share
- 📚 Documentation improvements

## Security issues

**Don't open a public issue.** Email the maintainer via the GitHub profile contact, with the word "SECURITY" in the subject. We aim to acknowledge within 48 hours.
