ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine

FROM ${NODE_IMAGE} AS build

ARG PNPM_REGISTRY=https://registry.npmjs.org
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    COREPACK_NPM_REGISTRY=${PNPM_REGISTRY}

WORKDIR /app

RUN corepack enable && pnpm config set registry "$PNPM_REGISTRY"

COPY frontend-workbench/package.json frontend-workbench/pnpm-lock.yaml frontend-workbench/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend-workbench/ ./
RUN pnpm build

FROM ${NGINX_IMAGE}

COPY frontend-workbench/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
