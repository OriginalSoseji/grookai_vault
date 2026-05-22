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

env = load_env_file('.env').merge(load_env_file('.env.local'))
required_keys = %w[SUPABASE_URL SUPABASE_PUBLISHABLE_KEY]
web_base = env['GROOKAI_WEB_BASE_URL'] ||
           env['NEXT_PUBLIC_SITE_URL'] ||
           env['SITE_URL']
env['GROOKAI_WEB_BASE_URL'] = web_base if web_base && !web_base.strip.empty?

missing = required_keys.select { |key| env[key].to_s.empty? }
unless missing.empty?
  warn "Missing required local Xcode secrets: #{missing.join(', ')}"
  exit 1
end

encoded = (required_keys + ['GROOKAI_WEB_BASE_URL']).map do |key|
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
