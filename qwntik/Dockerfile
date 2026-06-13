# Qwntik-Fabro: extends the upstream Fabro image with Qwntik defaults.
#
# Additions over upstream ghcr.io/fabro-sh/fabro:nightly:
#   - /etc/fabro/settings.default.toml  (ccflare provider + sonnet default)
#   - /etc/fabro/workflows/             (saythanks workflow templates)
#   - qwntik-entrypoint                 (seeds the above on first boot, then delegates upstream)
#
# Build: docker build -f qwntik/Dockerfile -t ghcr.io/bolivar1234/qwntik-fabro:latest .
FROM ghcr.io/fabro-sh/fabro:nightly

USER root

COPY qwntik/settings.default.toml /etc/fabro/settings.default.toml
COPY --chmod=0755 qwntik/entrypoint.sh /usr/local/bin/qwntik-entrypoint
# Create empty workflows dir; populated at runtime via entrypoint when templates are added.
RUN mkdir -p /etc/fabro/workflows

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/qwntik-entrypoint"]
CMD ["sh", "-c", "exec fabro server start --foreground --bind 0.0.0.0:${PORT:-32276}"]
