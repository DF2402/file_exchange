# 構建階段
FROM node:20-alpine AS builder

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製源代碼
COPY . .

# 生產階段
FROM node:20-alpine

# 安裝 wget
RUN apk add --no-cache wget

# 創建非 root 用戶
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 設置工作目錄
WORKDIR /app

# 從構建階段複製必要文件
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public

# 創建必要的目錄
RUN mkdir -p /app/src/middleware && chown -R appuser:appgroup /app

# 切換到非 root 用戶
USER appuser

# 暴露端口
EXPOSE 3500

# 設置環境變量
ENV NODE_ENV=production

# 啟動命令
CMD ["npm", "start"]