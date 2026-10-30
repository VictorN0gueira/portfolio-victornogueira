# Build stage. The base images are pinned by digest, so a rebuild is the same bytes; update a digest on purpose
# (docker buildx imagetools inspect node:22-alpine) when a Node or nginx security fix is wanted.
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build

WORKDIR /app

# The lockfile is committed: `npm ci` installs exactly what the audit and the tests saw.
COPY package.json package-lock.json ./
RUN npm ci

# .dockerignore keeps the host node_modules, .env files and build output out of this copy.
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
# nginx.conf includes this file in the server block and in every location.
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

# The master process runs as root and the workers as `nginx`, as in the official image. An unprivileged image would
# listen on 8080 and change the port the proxy forwards to, so it stays an owner decision (fix plan O-S4).
# The policy sends upgrade-insecure-requests: behind the TLS proxy that is right; over plain HTTP on any host but
# localhost the browser upgrades the page's own files to https and the page loads unstyled.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
