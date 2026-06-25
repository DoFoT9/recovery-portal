# v7.3.1 - Email provider correctly read from DB

Bugfix: the Settings UI was saving SMTP config to the database but the runtime
was silently falling back to the console adapter because `getBranding()` was
dropping the new email/SMTP keys on the read path.

## What was broken

`lib/branding.ts` exports a `Branding` interface and `DEFAULT_BRANDING` object.
The `getBranding()` function only reads keys from the DB that exist on
`DEFAULT_BRANDING` (the `KEYS` array). When v7.3 added `email_provider`,
`smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_from_email`,
`smtp_password_encrypted`, `email_send_welcome`, and `app_base_url`, those
were stored in the DB by `saveEmailConfig()` but `getBranding()` did not know
to read them back.

Result: `b.email_provider` was always `undefined`, the email dispatcher fell
back to `console`, and every "real" send was actually being written to
stdout. The UI showed a green tick because the console adapter does report
success - it just did not send any actual email.

## What's fixed

Two changes, both small:

1. **`lib/branding.ts`** - extended the `Branding` interface and
   `DEFAULT_BRANDING` to include all email/SMTP fields. Now `getBranding()`
   reads them from the DB and the email layer sees the right provider.

2. **`lib/email/config.ts`** - added two safety nets:
   - **Env var fallback**: if the DB does not have a value, falls back to env
     vars (`EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`,
     `SMTP_PORT`, `SMTP_FROM`, `APP_BASE_URL`). Useful for headless
     deployments managed by Kubernetes, Docker secrets, etc. The DB still
     wins when both are set.
   - **Loud downgrade**: if SMTP is selected but the host or user is missing,
     or the encrypted password cannot be decrypted, logs a `console.warn` and
     falls back to console rather than silently failing.

## Apply

For npm/source installs:

```bash
unzip -o rehab-portal-v7-3-1-email-config-fix.zip -d .
npm run build
sudo systemctl restart rehab-portal
```

For Docker installs (after pushing to GitHub):

```bash
git add lib/branding.ts lib/email/config.ts README-v7-3-1.md
git commit -m "Email provider correctly read from DB (v7.3.1)"
git tag v7.3.1
git push origin main --tags
```

## How to verify it worked

1. Hit your Email Settings page, confirm SMTP is selected, save
2. Click Send Test
3. Watch the journal:

   ```bash
   sudo journalctl -u rehab-portal -f
   ```

   You should now see `"provider":"smtp"` in the `email.sent` log line
   instead of `"provider":"console"`.

4. If Gmail is your provider and you're using port 587, make sure
   `smtp_secure` is unchecked (port 587 = STARTTLS, secure: false)

5. Real email should arrive in the inbox

## If it still falls back to console

Check the new warning logs in the journal:

```
[email] SMTP provider selected but incomplete (host="", user=""). Falling back to console.
[email] Could not decrypt SMTP password (TOTP_ENCRYPTION_KEY changed?). Falling back to console.
```

The first means the DB is missing host/user (resave from the UI). The second
means `TOTP_ENCRYPTION_KEY` has changed since the password was saved
(resave the password from the UI to re-encrypt with the current key).

## A note on the architectural decision

We kept env vars as a fallback (not a primary source) because:

- The Settings UI remains the canonical place to configure email
- Power users running on Kubernetes / managed orchestrators can override
  via env vars without needing to use the UI
- The fallback never silently overrides a UI-set value - DB always wins
- The downgrade-to-console path is now loud, not silent

This matches the pattern used by Vaultwarden, Gitea, and similar
self-hosted apps.
