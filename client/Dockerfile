# Demo client image. Build context is the repo root so the local
# @voxon/voice-input workspace package is available:
#   docker build -f client/Dockerfile .

FROM node:22-alpine AS build

WORKDIR /repo

COPY packages/voice-input packages/voice-input
RUN cd packages/voice-input && npm install && npm run build

COPY client client
RUN cd client && npm install && npm run build

FROM node:22-alpine

WORKDIR /app
COPY --from=build /repo/client/dist ./dist
COPY client/server.js ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
