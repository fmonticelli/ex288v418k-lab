FROM registry.access.redhat.com/ubi9/httpd-24:latest
COPY --chown=1001:0 index.html /var/www/html/git/index.html
ADD --chown=1001:0 site-1.0.tar.gz /var/www/html/
EXPOSE 8080
