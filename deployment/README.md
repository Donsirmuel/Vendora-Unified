Deployment helpers

This folder contains convenience artifacts to help with a one-shot, non-Docker deployment.

Files:
- droplet_deploy.sh - (existing) one-shot bootstrap script (review before running)
- vendora-unified.service.example - hardened systemd unit for Uvicorn/ASGI
- nginx_vendora.conf.example - example Nginx site config
- env.example.service - example systemd EnvironmentFile layout and usage notes
- backup_to_spaces.sh - backup script that uploads DB dump to S3/Spaces
- logrotate.vendora - example logrotate config for /var/log/vendora/*.log
- cloud-init-userdata.yaml - cloud-init user-data you can paste into DigitalOcean user-data when creating a droplet
- cleanup-report-generator.sh - small script to find large files and env backups

Quick usage notes:
- Edit `/etc/vendora/env` (or `backend/.env`) before enabling the systemd service.
- Install `channels_redis` and set `REDIS_URL` to enable Redis channel layer for Channels.
- Configure Certbot/Nginx before exposing the site publicly.
- Review `backup_to_spaces.sh` and set `S3_BUCKET` and credentials in environment or CI before running.

Security:
- Do NOT commit secrets. Keep `/etc/vendora/env` or `backend/.env` permissioned to root or the app user (600).

