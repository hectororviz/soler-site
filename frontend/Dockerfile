# Build local: docker build -t csd-soler-frontend .
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:3000/api/v1
ARG VITE_STREAMING_URL=https://streaming.csdsoler.com.ar
ENV VITE_API_URL=$VITE_API_URL VITE_USE_MOCKS=false VITE_STREAMING_URL=$VITE_STREAMING_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
