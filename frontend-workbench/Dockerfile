FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY frontend-workbench/package.json frontend-workbench/pnpm-lock.yaml frontend-workbench/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend-workbench/ ./
RUN pnpm build

FROM nginx:1.27-alpine

COPY frontend-workbench/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
