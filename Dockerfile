FROM node:20-alpine

WORKDIR /app

# Instalar pacotes globais necessários
RUN npm install -g typescript ts-node-dev prisma

# Vamos mapear o volume no docker-compose, por isso não copiamos tudo agora
# Apenas expomos a porta
EXPOSE 8083

# Comando padrão para manter o contentor vivo enquanto desenvolvemos
CMD ["sh", "-c", "npm install && npx prisma generate && ts-node-dev --respawn --transpile-only src/server.ts"]
