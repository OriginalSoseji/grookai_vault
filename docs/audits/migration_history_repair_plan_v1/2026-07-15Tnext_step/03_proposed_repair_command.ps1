# PLAN ONLY - DO NOT RUN WITHOUT EXPLICIT APPROVAL
#
# This command would mark the 12 schema-present/superseded local-only
# migration IDs as applied in the linked Supabase migration history.
# It intentionally excludes:
# - 20260523183000
# - 20260713190000
# - 20260715120000

supabase migration repair `
  20260629190000 `
  20260703090000 `
  20260706100000 `
  20260706110000 `
  20260706120000 `
  20260706121000 `
  20260706122000 `
  20260706123000 `
  20260708174000 `
  20260712090000 `
  20260715104500 `
  20260715110000 `
  --status applied `
  --linked `
  --yes
