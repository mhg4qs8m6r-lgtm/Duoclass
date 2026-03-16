# ---- Build stage ----
FROM node:20-slim AS build

WORKDIR /app

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Installer les dépendances (inclut devDependencies pour le build)
RUN pnpm install --frozen-lockfile

# Copier le reste du code source
COPY . .

# Build client (Vite → dist/public/) + serveur (esbuild → dist/index.js)
RUN pnpm run build

# ---- Production stage ----
FROM node:20-slim AS production

WORKDIR /app

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Installer uniquement les dépendances de production
RUN pnpm install --frozen-lockfile --prod

# Copier le build depuis le stage précédent
COPY --from=build /app/dist ./dist

# Copier les fichiers Drizzle pour les migrations
COPY drizzle/ ./drizzle/
COPY drizzle.config.ts ./

# Créer le répertoire uploads avec les bonnes permissions
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Utiliser un utilisateur non-root
USER node

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads

EXPOSE 3000

# Volumes pour la persistance
VOLUME ["/app/uploads"]

CMD ["node", "dist/index.js"]
