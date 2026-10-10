FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
RUN npm prune --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 5001
CMD ["node", "index.js"]
