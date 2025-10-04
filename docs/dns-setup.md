# DNS Setup for vendora.page

This guide explains how to connect your Name.com-registered domain `vendora.page` to DigitalOcean App Platform for:
- Backend API: `api.vendora.page`
- Frontend Web App (static): `app.vendora.page`
- (Optional) Apex / root: `vendora.page`

## What "3NS/1SOA – Directs to Unknown" Means
DigitalOcean is telling you that, in the DNS zone it *sees*, only the SOA record and the three NS records exist. There are no A, AAAA, CNAME, or other records yet, and/or DigitalOcean is **not** currently the authoritative DNS provider (Name.com still is). Until delegation or proper records are in place, DO cannot associate the domain with your App Platform components.

## Choose ONE DNS Control Strategy
| Strategy | When to Use | Pros | Cons |
|----------|-------------|------|------|
| A. Delegate to DigitalOcean (Recommended) | You want all DNS managed in one place | Simplest integration with App Platform custom domains | Nameserver change requires propagation (minutes–24h) |
| B. Keep Name.com DNS | You prefer to manage DNS where you bought the domain | No nameserver change | Must manually create/maintain CNAME/A records; slightly more room for error |

---
## Strategy A: Delegate Domain to DigitalOcean (Recommended)
1. In Name.com domain dashboard, locate Nameserver settings.
2. Replace existing nameservers with:
   ```
   ns1.digitalocean.com
   ns2.digitalocean.com
   ns3.digitalocean.com
   ```
3. Save. Propagation usually begins within minutes; allow up to 24 hours globally.
4. In DigitalOcean → Networking → Domains → Add `vendora.page` (if not already added).
5. In the App Platform app, add custom domains for `api.vendora.page` and `app.vendora.page` (you already have them in `app.yaml`). When DO manages DNS, it auto-creates the needed CNAME/A records for those hostnames.
6. (Optional) Decide how to handle the apex (`vendora.page`):
   - Redirect to `https://app.vendora.page/` (add a lightweight static redirect app or use an HTTP 301 rule if using an edge service later), **or**
   - Point apex directly to the frontend (add it as an additional custom domain on the static site). DO will insert the necessary A / ALIAS glue records.

### Verifying Delegation
Use PowerShell:
```powershell
Resolve-DnsName vendora.page -Type NS
```
Expected: answers listing `ns1.digitalocean.com`, etc. If you still see Name.com nameservers, delegation hasn’t propagated yet.

### After Propagation
Check each:
```powershell
Resolve-DnsName api.vendora.page
Resolve-DnsName app.vendora.page
```
You should see CNAME chains pointing to something like `your-app-id.ondigitalocean.app.` or, for apex, A records DO assigns.

---
## Strategy B: Keep Name.com DNS
If you keep Name.com as authoritative, you must create records manually that mirror the DO custom domain instructions shown in the App Platform UI when you add the domains there.

1. In App Platform → App → Settings → Domains: Add `api.vendora.page` and `app.vendora.page`.
2. DO will display required DNS targets (typically CNAME values ending in `.ondigitalocean.app`). Copy them.
3. In Name.com DNS management add:
   - Type: CNAME | Host: `api` | Value: `<backend-app-hash>.ondigitalocean.app.` | TTL: 300–600
   - Type: CNAME | Host: `app` | Value: `<frontend-app-hash>.ondigitalocean.app.` | TTL: 300–600
4. (Optional) Apex handling (`vendora.page`):
   - If Name.com supports ALIAS/ANAME: create ALIAS pointing to `app.vendora.page.`
   - Otherwise set up URL forwarding (301) from apex to `https://app.vendora.page/`.
5. Wait for propagation and then re-check in App Platform – certificate issuance should progress to “Active”.

### Verifying (Name.com as DNS)
```powershell
Resolve-DnsName api.vendora.page -Type CNAME
Resolve-DnsName app.vendora.page -Type CNAME
```
If they show the `.ondigitalocean.app` targets, you’re good.

---
## SSL/TLS Certificate Activation
DigitalOcean automatically provisions Let’s Encrypt certificates after:
1. The domain resolves (correct DNS records in place).
2. The App Platform deploy can complete domain ownership / challenge.
Typical issuance time: 1–15 minutes after DNS propagation.

If stuck in "Pending" > 1 hour:
- Confirm CNAME/A records are correct (no typos, trailing spaces).
- Ensure no CDN or proxy rewriting challenge requests.
- Re-save the domain entry in App Platform.

---
## Common Issues & Resolutions
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| 400 Bad Request from Django | Host not in `ALLOWED_HOSTS` | Add hostname (already updated to include `app.vendora.page`) |
| Domain shows “Directs to Unknown” | Only NS/SOA present, no A/CNAME or delegation incomplete | Add records or change nameservers to DO |
| SSL Pending | DNS not propagated or wrong record type | Verify with `Resolve-DnsName` / `dig` |
| CNAME loop error | Apex incorrectly set to CNAME pointing to itself | Use ALIAS/redirect strategy |
| Frontend loads but API 403/CSRF issues | Missing CSRF_TRUSTED_ORIGINS entry | Add `https://app.vendora.page` & apex if used |

---
## Quick Action Checklist (Delegate to DO)
1. Change nameservers at Name.com to DO (ns1/ns2/ns3).
2. Wait until `Resolve-DnsName vendora.page -Type NS` shows DO nameservers.
3. Ensure App Platform lists custom domains (already in spec) – DO auto creates records.
4. Verify certs show “Active”.
5. Test: `https://app.vendora.page/` and `https://api.vendora.page/health/`.
6. (Optional) Add apex redirect or second domain mapping.

---
## PowerShell Helper Commands
```powershell
# Check nameservers
Resolve-DnsName vendora.page -Type NS

# Check CNAME for subdomains
Resolve-DnsName api.vendora.page -Type CNAME
Resolve-DnsName app.vendora.page -Type CNAME

# If apex A records are used (after delegation)
Resolve-DnsName vendora.page -Type A
```

---
## Redirecting Apex to app.vendora.page (Optional)
If you prefer a redirect rather than serving the app at apex:
1. Create a small static site on App Platform bound to `vendora.page` with an `index.html`:
   ```html
   <meta http-equiv="refresh" content="0; url=https://app.vendora.page/" />
   ```
2. Or use an external edge redirect service / CDN rule.

---
## When to Revisit DNS
- Adding staging: add `staging.vendora.page` (CNAME to staging app). Update `ALLOWED_HOSTS` and CSRF origins.
- Adding marketing site at apex: repoint apex or publish landing assets separately.
- Adding email: create MX + SPF, DKIM, DMARC records in the DO zone (or keep email provider’s required records if delegating).

---
## Summary
"3NS/1SOA – Directs to Unknown" simply indicates the zone currently only has base records (SOA + NS) and no active A/CNAME linking to resources, or DO isn’t authoritative yet. Add the proper CNAME/A records (or delegate nameservers) and the status will clear once propagation finishes.

If you tell me which strategy (A or B) you chose, I can tailor next micro-steps or add the apex redirect automatically.
