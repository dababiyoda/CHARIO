# Security Policy

We manage secrets using AWS Systems Manager Parameter Store and Replit Secret Manager. Secrets are fetched at runtime and cached for five minutes.

All credentials are rotated every 90 days. Users must ensure new secrets are stored in the secret managers before rotation.

If you discover a vulnerability, please open an issue or contact the maintainers.
