FROM node:6.3

ENV APP_PATH /srv/appi

RUN mkdir -p $APP_PATH
WORKDIR $APP_PATH

COPY . $APP_PATH

RUN npm install

EXPOSE 8000
CMD ["node", "./dist"]