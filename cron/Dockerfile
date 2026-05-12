FROM alpine:3.20
RUN apk add --no-cache curl ca-certificates tzdata
ARG SUPERCRONIC_VERSION=v0.2.29
RUN wget -qO /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" \
 && chmod +x /usr/local/bin/supercronic
COPY crontab /etc/crontab
USER nobody
CMD ["supercronic", "/etc/crontab"]
