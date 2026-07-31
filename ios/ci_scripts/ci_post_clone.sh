#!/bin/sh

set -eu

: "${CI_PRIMARY_REPOSITORY_PATH:?CI_PRIMARY_REPOSITORY_PATH is required}"

FLUTTER_VERSION="${FLUTTER_VERSION:-3.44.7}"
FLUTTER_HOME="${HOME}/flutter"

cd "${CI_PRIMARY_REPOSITORY_PATH}"

if [ ! -x "${FLUTTER_HOME}/bin/flutter" ]; then
  git clone \
    --depth 1 \
    --branch "${FLUTTER_VERSION}" \
    https://github.com/flutter/flutter.git \
    "${FLUTTER_HOME}"
fi

export PATH="${FLUTTER_HOME}/bin:${PATH}"

flutter config --no-analytics
flutter precache --ios
flutter pub get --enforce-lockfile

if ! command -v pod >/dev/null 2>&1; then
  export HOMEBREW_NO_AUTO_UPDATE=1
  brew install cocoapods
fi

(
  cd ios
  pod install
)

flutter build ios --config-only --release
