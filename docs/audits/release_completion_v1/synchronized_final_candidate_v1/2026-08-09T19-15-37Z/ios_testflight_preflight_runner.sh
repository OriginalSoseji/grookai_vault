#!/bin/zsh

set +e

audit_root="/Users/cesarcabral/Library/Logs/Grookai/physical_smoke_289"
project_root="/Users/cesarcabral/Library/Logs/Grookai/physical_smoke_284"
result_bundle="${audit_root}/TestFlightPreflight.xcresult"
log_file="${audit_root}/xcodebuild.log"

mkdir -p "${audit_root}"
rm -rf "${result_bundle}"

cd "${project_root}" || exit 2
/usr/bin/xcodebuild test \
  -project GrookaiPhysicalSmoke.xcodeproj \
  -scheme GrookaiPhysicalSmoke \
  -destination "platform=iOS,id=7828E26C-BC77-5F00-BDEC-3545864095CB" \
  -resultBundlePath "${result_bundle}" \
  > "${log_file}" 2>&1

exit_status=$?
print -r -- "${exit_status}" > "${audit_root}/exit_code.txt"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "${audit_root}/completed_at_utc.txt"
exit "${exit_status}"
