FROM nginx:latest

RUN apt-get update && apt-get install openssl

RUN mkdir -p /etc/ssl/certs /etc/ssl/private
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt \
    -subj "/C=JP/ST=Tokyo/L=Tokyo/O=42Tokyo/OU=ft_transcendence/CN=ft_transcendence.local"

COPY conf/nginx.conf /etc/nginx/conf.d/default.conf
