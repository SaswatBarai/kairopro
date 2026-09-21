# The KairoPro app-runtime image (Phase 14 / BE-9): the one container image
# every generated project runs in. It carries no application code of its
# own — code is copied in at provision time (`docker cp`-equivalent, via
# `manager.ts`), never bind-mounted from the host. This is what makes "no
# host mounts" possible: the container's filesystem is genuinely its own.
#
# Runs as a non-root user (`app`, uid 10001) with no special capabilities.
# The default command just keeps the container alive — starting the
# generated app (`npm run dev`, etc.) is a build-orchestration concern
# (Phase 15), invoked via `exec`, not baked into this image.

FROM node:22-slim

RUN groupadd --gid 10001 app \
  && useradd --uid 10001 --gid app --shell /bin/sh --create-home app

WORKDIR /workspace
RUN chown app:app /workspace

USER app

CMD ["tail", "-f", "/dev/null"]
