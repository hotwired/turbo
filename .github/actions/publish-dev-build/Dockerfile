FROM alpine:latest

LABEL "com.github.actions.name"="publish-dev-build"
LABEL "com.github.actions.description"="Publish dev build to a Git tag"
LABEL "com.github.actions.icon"="package"
LABEL "com.github.actions.color"="blue"

RUN apk add --no-cache bash git jq

COPY "publish-dev-build" "/publish-dev-build"
CMD ["/publish-dev-build"]
