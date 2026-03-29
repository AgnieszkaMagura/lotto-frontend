FROM node:18.15.0-alpine as build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json /app/package.json
RUN yarn config set unsafe-perm true
RUN yarn install --silent
COPY . /app
RUN yarn run build

# production environment
FROM nginx:1.23.4-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/build /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]
