+++
title = 'Docker Best Practices for Production'
date = 2024-03-05T11:00:00-07:00
draft = false
tags = ['docker', 'devops', 'containers']
description = 'Essential Docker practices for production deployments'
+++

Running Docker in production requires more than just `docker run`. Here are some best practices I've learned.

## Use Multi-Stage Builds

Keep your images small by using multi-stage builds:

```dockerfile
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN go build -o main .

FROM alpine:latest
COPY --from=builder /app/main /main
CMD ["/main"]
```

## Don't Run as Root

Always specify a non-root user:

```dockerfile
RUN adduser -D appuser
USER appuser
```

## Health Checks

Add health checks so orchestrators know when your container is ready:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:8080/health || exit 1
```

## Key Takeaways

- Use specific image tags, not `latest`
- Minimize layers and image size
- Scan images for vulnerabilities
- Use `.dockerignore` to exclude unnecessary files
