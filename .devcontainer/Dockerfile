# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.191.1/containers/typescript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version: 16, 14, 12
ARG VARIANT="16-buster"
FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:0-${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        openjdk-11-jdk \
        firefox-esr

# Chromium and chrome-driver
ARG CHROMIUM_DEB_URL=https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN wget -qO - $CHROMIUM_DEB_URL > /tmp/chrome_linux64.deb \
    && apt -y install /tmp/chrome_linux64.deb -f \
    && FULL_CHROME_VERSION=$(google-chrome --product-version) \
    && CHROME_VERSION=${FULL_CHROME_VERSION%.*} \
    && CHROMEDRIVER_DIR="/usr/local/share/chrome_driver" \
    && CHROMEDRIVER_BIN="$CHROMEDRIVER_DIR/chromedriver" \
    && LATEST_CHROMEDRIVER_VERSION=$(curl -sL "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$CHROME_VERSION") \
    && CHROMEDRIVER_URL="https://chromedriver.storage.googleapis.com/$LATEST_CHROMEDRIVER_VERSION/chromedriver_linux64.zip" \
    && wget -qO - $CHROMEDRIVER_URL > /tmp/chromedriver_linux64.zip \
    && mkdir -p $CHROMEDRIVER_DIR \
    && unzip -qq /tmp/chromedriver_linux64.zip -d $CHROMEDRIVER_DIR \
    && chmod +x $CHROMEDRIVER_BIN \
    && ln -s "$CHROMEDRIVER_BIN" /usr/bin/ \
    && rm -rf /tmp/chrome*

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node packages
# RUN su node -c "npm install -g <your-package-list -here>"
