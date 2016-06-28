#!/usr/bin/env bash

# Adapted from https://github.com/electron/spectron/blob/master/script/travis-build.sh

install_nvm() {
  git clone https://github.com/creationix/nvm.git /tmp/.nvm
  echo "source /tmp/.nvm/nvm.sh" > ~/.bashrc
}

install_node() {
  nvm install "$NODE_VERSION"
  nvm use --delete-prefix "$NODE_VERSION"
}

start_headless_display_server() {
  if [[ "$TRAVIS_OS_NAME" == "linux" ]]; then
    export DISPLAY=:99.0
    sh -e /etc/init.d/xvfb start
    sleep 3
  fi
}

print_versions() {
  node --version
  npm --version
}

install_nvm
install_node
start_headless_display_server
print_versions