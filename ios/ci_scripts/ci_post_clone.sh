#!/bin/sh

set -eu

: "${CI_PRIMARY_REPOSITORY_PATH:?CI_PRIMARY_REPOSITORY_PATH is required}"

FLUTTER_VERSION="${FLUTTER_VERSION:-3.44.7}"
FLUTTER_HOME="${HOME}/flutter-${FLUTTER_VERSION}"

cd "${CI_PRIMARY_REPOSITORY_PATH}"

echo "xcode-cloud-bootstrap phase=flutter-sdk requested=${FLUTTER_VERSION} home=${FLUTTER_HOME}"

if [ ! -x "${FLUTTER_HOME}/bin/flutter" ]; then
  if [ -e "${FLUTTER_HOME}" ]; then
    echo "xcode-cloud-bootstrap error=incomplete-flutter-sdk home=${FLUTTER_HOME}" >&2
    exit 1
  fi

  git clone \
    --depth 1 \
    --branch "${FLUTTER_VERSION}" \
    https://github.com/flutter/flutter.git \
    "${FLUTTER_HOME}"
fi

export PATH="${FLUTTER_HOME}/bin:${PATH}"

ACTUAL_FLUTTER_VERSION="$(
  flutter --version --machine \
    | sed -n 's/.*"frameworkVersion"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
)"

if [ "${ACTUAL_FLUTTER_VERSION}" != "${FLUTTER_VERSION}" ]; then
  echo "xcode-cloud-bootstrap error=flutter-version-mismatch requested=${FLUTTER_VERSION} actual=${ACTUAL_FLUTTER_VERSION:-unknown}" >&2
  exit 1
fi

echo "xcode-cloud-bootstrap phase=flutter-precache version=${ACTUAL_FLUTTER_VERSION}"
flutter config --no-analytics
flutter precache --ios

echo "xcode-cloud-bootstrap phase=flutter-packages"
flutter pub get --enforce-lockfile

if ! command -v pod >/dev/null 2>&1; then
  echo "xcode-cloud-bootstrap phase=cocoapods-install"
  export HOMEBREW_NO_AUTO_UPDATE=1
  brew install cocoapods
fi

echo "xcode-cloud-bootstrap phase=pod-install"
(
  cd ios
  pod install
)

echo "xcode-cloud-bootstrap phase=release-config"
flutter build ios --config-only --release

echo "xcode-cloud-bootstrap phase=complete"
