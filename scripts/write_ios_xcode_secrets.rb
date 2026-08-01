#!/usr/bin/env ruby
# Generates ignored Xcode xcconfig files with Flutter DART_DEFINES.

require 'base64'

def load_env_file(path)
  return {} unless File.exist?(path)

  values = {}
  File.read(path).delete("\r").each_line do |raw|
    line = raw.strip
    next if line.empty? || line.start_with?('#')

    key, value = line.split('=', 2)
    next unless key && value

    key = key.strip
    value = value.strip
    if (value.start_with?('"') && value.end_with?('"')) ||
       (value.start_with?("'") && value.end_with?("'"))
      value = value[1...-1]
    end
    values[key] = value
  end
  values
end

required_keys = %w[SUPABASE_URL SUPABASE_PUBLISHABLE_KEY]
optional_keys = %w[GROOKAI_WEB_BASE_URL NEXT_PUBLIC_SITE_URL SITE_URL]
binder_keys = %w[
  BINDERS_SCHEMA_V1
  BINDERS_PERSONAL_V1
  BINDERS_SHARED_V1
  BINDERS_VIEW_LINKS_V1
  BINDERS_PUBLIC_V1
  BINDERS_COMMUNITY_V1
  BINDERS_TEMPLATES_V1
  BINDERS_NOTIFICATIONS_V1
  BINDERS_PULSE_SHARING_V1
  BINDERS_SET_TARGET_V1
  BINDERS_CUSTOM_TARGET_V1
]

# These public compile-time gates mirror the production Binder activation
# readback. Process or dotenv values may still override them for containment.
release_defaults = {
  'BINDERS_SCHEMA_V1' => 'true',
  'BINDERS_PERSONAL_V1' => 'true',
  'BINDERS_SHARED_V1' => 'true',
  'BINDERS_VIEW_LINKS_V1' => 'true',
  'BINDERS_PUBLIC_V1' => 'true',
  'BINDERS_COMMUNITY_V1' => 'true',
  'BINDERS_TEMPLATES_V1' => 'true',
  'BINDERS_NOTIFICATIONS_V1' => 'false',
  'BINDERS_PULSE_SHARING_V1' => 'false',
  'BINDERS_SET_TARGET_V1' => 'false',
  'BINDERS_CUSTOM_TARGET_V1' => 'true'
}
env = release_defaults
      .merge(load_env_file('.env'))
      .merge(load_env_file('.env.local'))

# Xcode Cloud supplies release configuration as workflow environment variables.
# Process values take precedence over local dotenv files without ever being
# written to a tracked file or printed to the build log.
(required_keys + optional_keys + binder_keys).each do |key|
  value = ENV[key].to_s
  env[key] = value unless value.strip.empty?
end

web_base = env['GROOKAI_WEB_BASE_URL'] ||
           env['NEXT_PUBLIC_SITE_URL'] ||
           env['SITE_URL']
env['GROOKAI_WEB_BASE_URL'] = web_base if web_base && !web_base.strip.empty?

missing = required_keys.select { |key| env[key].to_s.empty? }
unless missing.empty?
  warn "Missing required local Xcode secrets: #{missing.join(', ')}"
  exit 1
end

encoded = (required_keys + ['GROOKAI_WEB_BASE_URL'] + binder_keys).map do |key|
  value = env[key].to_s
  value.empty? ? nil : Base64.strict_encode64("#{key}=#{value}")
end.compact.join(',')

content = <<~XCCONFIG
  // Local generated file. Do not commit.
  DART_DEFINES=#{encoded}
XCCONFIG

%w[DebugSecrets.xcconfig ReleaseSecrets.xcconfig].each do |name|
  File.write(File.join('ios', 'Flutter', name), content)
end

puts 'Wrote ios/Flutter/DebugSecrets.xcconfig and ios/Flutter/ReleaseSecrets.xcconfig'
