#!/usr/bin/env ruby
# frozen_string_literal: true

require "base64"
require "digest"
require "fileutils"
require "json"
require "net/http"
require "openssl"
require "optparse"
require "time"
require "uri"

API_BASE = "https://api.appstoreconnect.apple.com"
DEFAULT_CONFIG = "docs/release/app_store_connect_ios_1_0.json"
DEFAULT_ENV = ".env.appstoreconnect.local"

class AppStoreConnectError < StandardError; end

def load_env_file(path)
  return unless File.exist?(path)

  File.readlines(path, chomp: true).each do |line|
    stripped = line.strip
    next if stripped.empty? || stripped.start_with?("#") || !stripped.include?("=")

    key, value = stripped.split("=", 2)
    key = key.strip
    next if key.empty? || ENV.key?(key)

    value = value.strip
    if (value.start_with?('"') && value.end_with?('"')) || (value.start_with?("'") && value.end_with?("'"))
      value = value[1...-1]
    end
    ENV[key] = value
  end
end

def blank?(value)
  value.nil? || value.to_s.strip.empty?
end

def base64url(value)
  Base64.urlsafe_encode64(value).delete("=")
end

def first_env(*names)
  names.each do |name|
    value = ENV[name]
    return value unless blank?(value)
  end
  nil
end

def int_to_fixed_bytes(value, length)
  hex = value.to_i.to_s(16)
  hex = "0#{hex}" if hex.length.odd?
  [hex].pack("H*").rjust(length, "\0")
end

def jwt_signature(private_key, signing_input)
  digest = OpenSSL::Digest::SHA256.digest(signing_input)
  der = private_key.dsa_sign_asn1(digest)
  sequence = OpenSSL::ASN1.decode(der)
  r = int_to_fixed_bytes(sequence.value[0].value, 32)
  s = int_to_fixed_bytes(sequence.value[1].value, 32)
  r + s
end

def build_jwt(key_id:, issuer_id:, key_path:)
  private_key = OpenSSL::PKey.read(File.read(key_path))
  now = Time.now.to_i
  header = { "alg" => "ES256", "kid" => key_id, "typ" => "JWT" }
  payload = {
    "iss" => issuer_id,
    "iat" => now,
    "exp" => now + (20 * 60),
    "aud" => "appstoreconnect-v1"
  }
  signing_input = "#{base64url(JSON.generate(header))}.#{base64url(JSON.generate(payload))}"
  "#{signing_input}.#{base64url(jwt_signature(private_key, signing_input))}"
end

class AppStoreConnectClient
  def initialize
    @key_id = first_env("ASC_KEY_ID", "APP_STORE_CONNECT_API_KEY_ID")
    @issuer_id = first_env("ASC_ISSUER_ID", "APP_STORE_CONNECT_API_ISSUER_ID")
    key_path = first_env("ASC_KEY_PATH", "APP_STORE_CONNECT_API_KEY_PATH")
    key_path ||= "~/.appstoreconnect/private_keys/AuthKey_#{@key_id}.p8" unless blank?(@key_id)
    @key_path = File.expand_path(key_path.to_s) unless blank?(key_path)

    missing = []
    missing << "ASC_KEY_ID" if blank?(@key_id)
    missing << "ASC_ISSUER_ID" if blank?(@issuer_id)
    missing << "ASC_KEY_PATH or ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8" if blank?(@key_path) || !File.exist?(@key_path)
    raise AppStoreConnectError, "Missing App Store Connect API auth: #{missing.join(", ")}" unless missing.empty?

    @jwt = build_jwt(key_id: @key_id, issuer_id: @issuer_id, key_path: @key_path)
  end

  def get(path, query = {})
    request(Net::HTTP::Get, path, query)
  end

  def post(path, body)
    request(Net::HTTP::Post, path, {}, body)
  end

  def patch(path, body)
    request(Net::HTTP::Patch, path, {}, body)
  end

  def delete(path)
    request(Net::HTTP::Delete, path)
  end

  private

  def request(klass, path, query = {}, body = nil)
    uri = URI("#{API_BASE}#{path}")
    uri.query = URI.encode_www_form(query) unless query.empty?
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.read_timeout = 60
    http.open_timeout = 30

    req = klass.new(uri)
    req["Authorization"] = "Bearer #{@jwt}"
    req["Content-Type"] = "application/json"
    req["Accept"] = "application/json"
    req.body = JSON.generate(body) unless body.nil?

    response = http.request(req)
    parsed = blank?(response.body) ? {} : JSON.parse(response.body)
    return parsed if response.is_a?(Net::HTTPSuccess)

    message = parsed["errors"] ? JSON.generate(parsed["errors"]) : response.body
    raise AppStoreConnectError, "#{klass::METHOD} #{uri.path} failed: HTTP #{response.code} #{message}"
  end
end

class IosReleaseAutomation
  def initialize(config, client = nil)
    @config = config
    @client = client
  end

  def archive
    puts "Generating ignored iOS secret xcconfig files..."
    run(["ruby", "scripts/write_ios_xcode_secrets.rb"])

    puts "Building Flutter release app..."
    run(["flutter", "build", "ios", "--release", "--no-pub"])

    FileUtils.mkdir_p(File.dirname(archive_path))
    puts "Archiving #{version_string}+#{build_number} to #{archive_path}..."
    run([
      "xcodebuild",
      "-workspace", "ios/Runner.xcworkspace",
      "-scheme", "Runner",
      "-configuration", "Release",
      "-destination", "generic/platform=iOS",
      "-archivePath", archive_path,
      "-allowProvisioningUpdates",
      "archive"
    ])
  end

  def upload_archive
    raise AppStoreConnectError, "Archive does not exist: #{archive_path}" unless File.exist?(archive_path)

    FileUtils.rm_rf(export_path)
    FileUtils.mkdir_p(export_path)
    puts "Uploading archive to App Store Connect..."
    run([
      "xcodebuild",
      "-exportArchive",
      "-archivePath", archive_path,
      "-exportPath", export_path,
      "-exportOptionsPlist", export_options_plist,
      "-allowProvisioningUpdates"
    ])
  end

  def apply_metadata(wait_build: false, wait_seconds: 1800, skip_review: false, skip_attach_build: false, skip_beta: false)
    require_client!
    version = app_store_version

    update_app_store_version(version)
    update_version_localization(version)
    update_app_info_localization
    update_age_rating_declaration
    ensure_price_schedule
    update_review_detail(version) unless skip_review
    update_beta_app_localization unless skip_beta

    unless skip_attach_build
      build = find_build(wait: wait_build, wait_seconds: wait_seconds)
      if build
        attach_build(version, build)
        update_beta_build_localization(build) unless skip_beta
      else
        puts "No processed build #{version_string}+#{build_number} was available to attach yet."
      end
    end

    puts "App Store Connect metadata automation completed."
  end

  def upload_screenshots(replace: true)
    require_client!
    version = app_store_version
    localization = find_or_create_version_localization(version)
    sets = @config.fetch("screenshot_sets", [])
    raise AppStoreConnectError, "No screenshot_sets configured." if sets.empty?

    sets.each do |set_config|
      display_type = set_config.fetch("display_type")
      paths = set_config.fetch("paths")
      raise AppStoreConnectError, "No screenshot paths configured for #{display_type}" if paths.empty?

      screenshot_set = find_or_create_screenshot_set(localization, display_type)
      delete_existing_screenshots(screenshot_set) if replace
      paths.each do |path|
        upload_screenshot_file(screenshot_set, path)
      end
    end

    puts "Screenshot upload automation completed."
  end

  def status
    require_client!
    version = app_store_version
    attrs = version.fetch("attributes", {})
    puts "App Store version: #{attrs["versionString"]} (#{attrs["appStoreState"] || attrs["appVersionState"]})"

    build = latest_matching_build
    if build
      build_attrs = build.fetch("attributes", {})
      puts "Matching build: #{build_attrs["version"]} processingState=#{build_attrs["processingState"]}"
    else
      puts "Matching build: not found"
    end

    info = find_app_info(required: false)
    if info
      info_attrs = info.fetch("attributes", {})
      puts "Age rating: #{info_attrs["appStoreAgeRating"] || "not set"}"
    end

    price = current_base_price
    if price
      puts "Base price: #{price.fetch(:territory)} #{price.fetch(:customer_price)}"
    else
      puts "Base price: not set"
    end
  end

  def update_age_rating_declaration
    attributes = compact_hash(@config.fetch("age_rating_declaration", {}))
    return if attributes.empty?

    app_info = find_app_info
    puts "Updating age rating declaration..."
    @client.patch(
      "/v1/ageRatingDeclarations/#{app_info.fetch("id")}",
      json_api("ageRatingDeclarations", app_info.fetch("id"), attributes)
    )
  end

  def ensure_price_schedule
    config = @config.fetch("price_schedule", {})
    return if config.empty?

    territory = config.fetch("baseTerritory", "USA")
    customer_price = config.fetch("customerPrice", "0.0").to_s

    if price_configured?(territory, customer_price)
      puts "App price already configured: #{territory} #{customer_price}"
      return
    end

    price_point = find_app_price_point(territory, customer_price)
    local_price_id = "${grookai-price-#{territory.downcase}}"

    puts "Configuring app price: #{territory} #{customer_price}..."
    @client.post(
      "/v1/appPriceSchedules",
      {
        "data" => {
          "type" => "appPriceSchedules",
          "attributes" => {},
          "relationships" => {
            "app" => {
              "data" => { "type" => "apps", "id" => app_id }
            },
            "baseTerritory" => {
              "data" => { "type" => "territories", "id" => territory }
            },
            "manualPrices" => {
              "data" => [{ "type" => "appPrices", "id" => local_price_id }]
            }
          }
        },
        "included" => [
          {
            "type" => "appPrices",
            "id" => local_price_id,
            "attributes" => {
              "startDate" => nil,
              "endDate" => nil
            },
            "relationships" => {
              "appPricePoint" => {
                "data" => {
                  "type" => "appPricePoints",
                  "id" => price_point.fetch("id")
                }
              }
            }
          }
        ]
      }
    )
  end

  private

  def app_id
    @config.fetch("app_id")
  end

  def platform
    @config.fetch("platform", "IOS")
  end

  def locale
    @config.fetch("locale", "en-US")
  end

  def version_string
    @config.fetch("version_string")
  end

  def build_number
    @config.fetch("build_number").to_s
  end

  def build_marketing_version
    @config.fetch("build_marketing_version", version_string)
  end

  def archive_path
    @config.fetch("archive_path")
  end

  def export_path
    @config.fetch("export_path")
  end

  def export_options_plist
    @config.fetch("export_options_plist", "ios/ExportOptionsAppStore.plist")
  end

  def require_client!
    @client ||= AppStoreConnectClient.new
  end

  def find_app_info(required: true)
    response = @client.get(
      "/v1/apps/#{app_id}/appInfos",
      "fields[appInfos]" => "appStoreAgeRating,kidsAgeBand,state,ageRatingDeclaration,appInfoLocalizations",
      "limit" => "10"
    )
    app_info = response.fetch("data", []).first
    raise AppStoreConnectError, "No appInfo record found for app #{app_id}" if required && !app_info

    app_info
  end

  def run(command)
    puts "$ #{command.join(" ")}"
    ok = system(*command)
    raise AppStoreConnectError, "Command failed: #{command.join(" ")}" unless ok
  end

  def app_store_version
    response = @client.get(
      "/v1/apps/#{app_id}/appStoreVersions",
      "filter[platform]" => platform,
      "filter[versionString]" => version_string,
      "fields[appStoreVersions]" => "versionString,appStoreState,appVersionState,copyright,releaseType",
      "limit" => "10"
    )
    version = response.fetch("data", []).find do |row|
      row.dig("attributes", "versionString") == version_string
    end
    raise AppStoreConnectError, "Could not find #{platform} App Store version #{version_string} for app #{app_id}" unless version

    version
  end

  def update_app_store_version(version)
    attributes = compact_hash(@config.fetch("app_store_version", {}))
    return if attributes.empty?

    puts "Updating App Store version settings..."
    @client.patch(
      "/v1/appStoreVersions/#{version.fetch("id")}",
      json_api("appStoreVersions", version.fetch("id"), attributes)
    )
  end

  def update_version_localization(version)
    attributes = compact_hash(@config.fetch("version_localization", {}))
    return if attributes.empty?

    localization = find_or_create_version_localization(version)
    puts "Updating App Store version localization #{locale}..."
    @client.patch(
      "/v1/appStoreVersionLocalizations/#{localization.fetch("id")}",
      json_api("appStoreVersionLocalizations", localization.fetch("id"), attributes)
    )
  end

  def find_or_create_version_localization(version)
    response = @client.get(
      "/v1/appStoreVersions/#{version.fetch("id")}/appStoreVersionLocalizations",
      "fields[appStoreVersionLocalizations]" => "locale,description,keywords,marketingUrl,promotionalText,supportUrl,whatsNew",
      "limit" => "200"
    )
    found = response.fetch("data", []).find { |row| row.dig("attributes", "locale") == locale }
    return found if found

    puts "Creating App Store version localization #{locale}..."
    @client.post(
      "/v1/appStoreVersionLocalizations",
      {
        "data" => {
          "type" => "appStoreVersionLocalizations",
          "attributes" => { "locale" => locale },
          "relationships" => {
            "appStoreVersion" => {
              "data" => { "type" => "appStoreVersions", "id" => version.fetch("id") }
            }
          }
        }
      }
    ).fetch("data")
  end

  def update_app_info_localization
    attributes = compact_hash(@config.fetch("app_info_localization", {}))
    return if attributes.empty?

    app_info = find_app_info(required: false)
    unless app_info
      puts "No appInfo record found; skipping app info localization."
      return
    end

    localization_response = @client.get(
      "/v1/appInfos/#{app_info.fetch("id")}/appInfoLocalizations",
      "fields[appInfoLocalizations]" => "locale,name,privacyPolicyUrl,privacyChoicesUrl,subtitle",
      "limit" => "200"
    )
    localization = localization_response.fetch("data", []).find { |row| row.dig("attributes", "locale") == locale }
    unless localization
      puts "No app info localization #{locale} found; skipping subtitle/privacy policy update."
      return
    end

    puts "Updating app info localization #{locale}..."
    @client.patch(
      "/v1/appInfoLocalizations/#{localization.fetch("id")}",
      json_api("appInfoLocalizations", localization.fetch("id"), attributes)
    )
  end

  def update_review_detail(version)
    attributes = review_detail_attributes
    response = @client.get("/v1/appStoreVersions/#{version.fetch("id")}/appStoreReviewDetail")
    detail = response["data"]

    if detail
      puts "Updating App Review details..."
      @client.patch(
        "/v1/appStoreReviewDetails/#{detail.fetch("id")}",
        json_api("appStoreReviewDetails", detail.fetch("id"), attributes)
      )
    else
      puts "Creating App Review details..."
      @client.post(
        "/v1/appStoreReviewDetails",
        {
          "data" => {
            "type" => "appStoreReviewDetails",
            "attributes" => attributes,
            "relationships" => {
              "appStoreVersion" => {
                "data" => { "type" => "appStoreVersions", "id" => version.fetch("id") }
              }
            }
          }
        }
      )
    end
  end

  def review_detail_attributes
    attributes = @config.fetch("review_detail", {}).dup
    attributes["contactPhone"] = first_env("ASC_REVIEW_CONTACT_PHONE", "APP_REVIEW_CONTACT_PHONE") unless blank?(first_env("ASC_REVIEW_CONTACT_PHONE", "APP_REVIEW_CONTACT_PHONE"))
    attributes["demoAccountName"] = first_env("ASC_DEMO_USERNAME", "APP_REVIEW_DEMO_USERNAME") unless blank?(first_env("ASC_DEMO_USERNAME", "APP_REVIEW_DEMO_USERNAME"))
    attributes["demoAccountPassword"] = first_env("ASC_DEMO_PASSWORD", "APP_REVIEW_DEMO_PASSWORD") unless blank?(first_env("ASC_DEMO_PASSWORD", "APP_REVIEW_DEMO_PASSWORD"))
    attributes = compact_hash(attributes)

    required = %w[contactFirstName contactLastName contactEmail contactPhone]
    if attributes["demoAccountRequired"] == true
      required += %w[demoAccountName demoAccountPassword]
    end
    missing = required.select { |key| blank?(attributes[key]) }
    unless missing.empty?
      raise AppStoreConnectError, "Missing App Review values: #{missing.join(", ")}. Set ASC_REVIEW_CONTACT_PHONE, ASC_DEMO_USERNAME, and ASC_DEMO_PASSWORD as needed."
    end

    attributes
  end

  def update_beta_app_localization
    attributes = compact_hash(@config.fetch("beta_app_localization", {}))
    return if attributes.empty?

    response = @client.get(
      "/v1/apps/#{app_id}/betaAppLocalizations",
      "fields[betaAppLocalizations]" => "locale,description,feedbackEmail,marketingUrl,privacyPolicyUrl",
      "limit" => "200"
    )
    localization = response.fetch("data", []).find { |row| row.dig("attributes", "locale") == locale }

    if localization
      puts "Updating TestFlight beta app localization #{locale}..."
      @client.patch(
        "/v1/betaAppLocalizations/#{localization.fetch("id")}",
        json_api("betaAppLocalizations", localization.fetch("id"), attributes)
      )
    else
      puts "Creating TestFlight beta app localization #{locale}..."
      @client.post(
        "/v1/betaAppLocalizations",
        {
          "data" => {
            "type" => "betaAppLocalizations",
            "attributes" => attributes.merge("locale" => locale),
            "relationships" => {
              "app" => {
                "data" => { "type" => "apps", "id" => app_id }
              }
            }
          }
        }
      )
    end
  end

  def find_build(wait:, wait_seconds:)
    deadline = Time.now + wait_seconds.to_i
    loop do
      build = latest_matching_build
      state = build ? build.dig("attributes", "processingState") : "not found"
      return build if build && state == "VALID"
      return nil unless wait

      if Time.now >= deadline
        puts "Timed out waiting for build #{version_string}+#{build_number}; latest state was #{state}."
        return nil
      end

      puts "Waiting for build #{version_string}+#{build_number} to finish processing; current state: #{state}."
      sleep 30
    end
  end

  def latest_matching_build
    response = @client.get(
      "/v1/builds",
      "filter[app]" => app_id,
      "filter[version]" => build_number,
      "include" => "preReleaseVersion",
      "fields[builds]" => "version,processingState,uploadedDate,expired,preReleaseVersion",
      "fields[preReleaseVersions]" => "version,platform",
      "limit" => "200",
      "sort" => "-uploadedDate"
    )

    pre_release_versions = {}
    response.fetch("included", []).each do |row|
      next unless row["type"] == "preReleaseVersions"

      pre_release_versions[row.fetch("id")] = row
    end

    response.fetch("data", []).find do |build|
      relation = build.dig("relationships", "preReleaseVersion", "data")
      pre_release = relation && pre_release_versions[relation["id"]]
      pre_release && [version_string, build_marketing_version].include?(pre_release.dig("attributes", "version"))
    end
  end

  def attach_build(version, build)
    puts "Attaching build #{version_string}+#{build_number} to App Store version #{version_string}..."
    @client.patch(
      "/v1/appStoreVersions/#{version.fetch("id")}/relationships/build",
      {
        "data" => {
          "type" => "builds",
          "id" => build.fetch("id")
        }
      }
    )
  end

  def update_beta_build_localization(build)
    attributes = compact_hash(@config.fetch("beta_build_localization", {}))
    return if attributes.empty?

    response = @client.get(
      "/v1/builds/#{build.fetch("id")}/betaBuildLocalizations",
      "fields[betaBuildLocalizations]" => "locale,whatsNew",
      "limit" => "200"
    )
    localization = response.fetch("data", []).find { |row| row.dig("attributes", "locale") == locale }

    if localization
      puts "Updating TestFlight build localization #{locale}..."
      @client.patch(
        "/v1/betaBuildLocalizations/#{localization.fetch("id")}",
        json_api("betaBuildLocalizations", localization.fetch("id"), attributes)
      )
    else
      puts "Creating TestFlight build localization #{locale}..."
      @client.post(
        "/v1/betaBuildLocalizations",
        {
          "data" => {
            "type" => "betaBuildLocalizations",
            "attributes" => attributes.merge("locale" => locale),
            "relationships" => {
              "build" => {
                "data" => { "type" => "builds", "id" => build.fetch("id") }
              }
            }
          }
        }
      )
    end
  end

  def manual_price_response
    @client.get(
      "/v1/appPriceSchedules/#{app_id}/manualPrices",
      "include" => "appPricePoint,territory",
      "fields[appPrices]" => "manual,startDate,endDate,appPricePoint,territory",
      "fields[appPricePoints]" => "customerPrice,proceeds,territory",
      "fields[territories]" => "currency",
      "limit" => "200"
    )
  rescue AppStoreConnectError => e
    raise unless e.message.include?("HTTP 404")

    { "data" => [], "included" => [] }
  end

  def current_base_price
    response = manual_price_response
    included = response.fetch("included", [])
    price_points = included.select { |row| row["type"] == "appPricePoints" }.to_h { |row| [row.fetch("id"), row] }

    current = response.fetch("data", []).find do |price|
      attrs = price.fetch("attributes", {})
      attrs["manual"] == true && attrs["startDate"].nil? && attrs["endDate"].nil?
    end
    return nil unless current

    price_point_id = current.dig("relationships", "appPricePoint", "data", "id")
    territory = current.dig("relationships", "territory", "data", "id")
    price_point = price_points[price_point_id]
    return nil unless price_point

    {
      territory: territory,
      customer_price: price_point.dig("attributes", "customerPrice")
    }
  end

  def price_configured?(territory, customer_price)
    price = current_base_price
    return false unless price

    price.fetch(:territory) == territory && numeric_equal?(price.fetch(:customer_price), customer_price)
  end

  def find_app_price_point(territory, customer_price)
    response = @client.get(
      "/v1/apps/#{app_id}/appPricePoints",
      "filter[territory]" => territory,
      "fields[appPricePoints]" => "customerPrice,proceeds,territory",
      "limit" => "200"
    )
    price_point = response.fetch("data", []).find do |row|
      numeric_equal?(row.dig("attributes", "customerPrice"), customer_price)
    end
    raise AppStoreConnectError, "No #{territory} app price point found for customerPrice=#{customer_price}" unless price_point

    price_point
  end

  def numeric_equal?(left, right)
    left.to_s.to_f == right.to_s.to_f
  end

  def find_or_create_screenshot_set(localization, display_type)
    response = @client.get(
      "/v1/appStoreVersionLocalizations/#{localization.fetch("id")}/appScreenshotSets",
      "filter[screenshotDisplayType]" => display_type,
      "fields[appScreenshotSets]" => "screenshotDisplayType,appScreenshots",
      "limit" => "10"
    )
    found = response.fetch("data", []).find { |row| row.dig("attributes", "screenshotDisplayType") == display_type }
    return found if found

    puts "Creating screenshot set #{display_type}..."
    @client.post(
      "/v1/appScreenshotSets",
      {
        "data" => {
          "type" => "appScreenshotSets",
          "attributes" => {
            "screenshotDisplayType" => display_type
          },
          "relationships" => {
            "appStoreVersionLocalization" => {
              "data" => {
                "type" => "appStoreVersionLocalizations",
                "id" => localization.fetch("id")
              }
            }
          }
        }
      }
    ).fetch("data")
  end

  def delete_existing_screenshots(screenshot_set)
    response = @client.get(
      "/v1/appScreenshotSets/#{screenshot_set.fetch("id")}/appScreenshots",
      "fields[appScreenshots]" => "fileName,assetDeliveryState",
      "limit" => "50"
    )
    screenshots = response.fetch("data", [])
    return if screenshots.empty?

    puts "Deleting #{screenshots.length} existing screenshot(s) from #{screenshot_set.dig("attributes", "screenshotDisplayType")}..."
    screenshots.each do |screenshot|
      @client.delete("/v1/appScreenshots/#{screenshot.fetch("id")}")
    end
  end

  def upload_screenshot_file(screenshot_set, path)
    raise AppStoreConnectError, "Screenshot does not exist: #{path}" unless File.exist?(path)

    file_name = File.basename(path)
    file_size = File.size(path)
    checksum = Digest::MD5.file(path).hexdigest
    display_type = screenshot_set.dig("attributes", "screenshotDisplayType")

    puts "Reserving screenshot #{file_name} for #{display_type}..."
    reservation = @client.post(
      "/v1/appScreenshots",
      {
        "data" => {
          "type" => "appScreenshots",
          "attributes" => {
            "fileName" => file_name,
            "fileSize" => file_size
          },
          "relationships" => {
            "appScreenshotSet" => {
              "data" => {
                "type" => "appScreenshotSets",
                "id" => screenshot_set.fetch("id")
              }
            }
          }
        }
      }
    ).fetch("data")

    upload_operations = reservation.dig("attributes", "uploadOperations") || []
    raise AppStoreConnectError, "Apple returned no upload operations for #{file_name}" if upload_operations.empty?

    bytes = File.binread(path)
    upload_operations.each_with_index do |operation, index|
      upload_asset_part(operation, bytes)
      puts "Uploaded part #{index + 1}/#{upload_operations.length} for #{file_name}."
    end

    puts "Committing screenshot #{file_name}..."
    @client.patch(
      "/v1/appScreenshots/#{reservation.fetch("id")}",
      json_api(
        "appScreenshots",
        reservation.fetch("id"),
        {
          "sourceFileChecksum" => checksum,
          "uploaded" => true
        }
      )
    )
  end

  def upload_asset_part(operation, bytes)
    method_name = operation.fetch("method")
    uri = URI(operation.fetch("url"))
    offset = operation.fetch("offset").to_i
    length = operation.fetch("length").to_i
    body = bytes.byteslice(offset, length)

    request_class = case method_name
                    when "PUT" then Net::HTTP::Put
                    when "POST" then Net::HTTP::Post
                    else
                      raise AppStoreConnectError, "Unsupported asset upload method: #{method_name}"
                    end

    request = request_class.new(uri)
    (operation["requestHeaders"] || []).each do |header|
      request[header.fetch("name")] = header.fetch("value")
    end
    request.body = body

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.read_timeout = 120
    response = http.request(request)
    return if response.is_a?(Net::HTTPSuccess)

    raise AppStoreConnectError, "Asset upload failed: HTTP #{response.code} #{response.body}"
  end

  def json_api(type, id, attributes)
    {
      "data" => {
        "type" => type,
        "id" => id,
        "attributes" => attributes
      }
    }
  end

  def compact_hash(hash)
    hash.each_with_object({}) do |(key, value), memo|
      memo[key] = value unless value.nil?
    end
  end
end

def usage
  <<~TEXT
    Usage:
      ruby scripts/app_store_connect/ios_release_automation.rb archive [options]
      ruby scripts/app_store_connect/ios_release_automation.rb upload [options]
      ruby scripts/app_store_connect/ios_release_automation.rb apply [options]
      ruby scripts/app_store_connect/ios_release_automation.rb screenshots [options]
      ruby scripts/app_store_connect/ios_release_automation.rb release [options]
      ruby scripts/app_store_connect/ios_release_automation.rb status [options]

    Commands:
      archive   Generate iOS config, build Flutter release, and create an .xcarchive.
      upload    Upload the configured archive to App Store Connect via xcodebuild.
      apply     Update App Store metadata/review/TestFlight info and attach the build.
      screenshots Upload configured App Store screenshots through Apple's asset API.
      release   Run archive, upload, then apply.
      status    Print the App Store version and matching build processing state.

    Required for API commands:
      ASC_KEY_ID, ASC_ISSUER_ID, and ASC_KEY_PATH
      If ASC_KEY_PATH is omitted, the script looks for:
      ~/.appstoreconnect/private_keys/AuthKey_<ASC_KEY_ID>.p8
      Values in .env.appstoreconnect.local are loaded automatically.

    Required unless --skip-review:
      ASC_REVIEW_CONTACT_PHONE
      ASC_DEMO_USERNAME
      ASC_DEMO_PASSWORD
  TEXT
end

options = {
  config: DEFAULT_CONFIG,
  wait_build: false,
  wait_seconds: 1800,
  skip_review: false,
  skip_attach_build: false,
  skip_beta: false
}

command = ARGV.first && !ARGV.first.start_with?("-") ? ARGV.shift : "status"

parser = OptionParser.new do |opts|
  opts.banner = usage
  opts.on("--config PATH", "Release metadata JSON path") { |value| options[:config] = value }
  opts.on("--wait-build", "Wait for App Store Connect build processing before attaching") { options[:wait_build] = true }
  opts.on("--wait-seconds SECONDS", Integer, "Build processing wait timeout") { |value| options[:wait_seconds] = value }
  opts.on("--skip-review", "Do not update App Review contact/demo details") { options[:skip_review] = true }
  opts.on("--skip-attach-build", "Do not attach the processed build") { options[:skip_attach_build] = true }
  opts.on("--skip-beta", "Do not update TestFlight beta localization fields") { options[:skip_beta] = true }
  opts.on("--keep-existing-screenshots", "Upload screenshots without deleting existing configured display sets") { options[:replace_screenshots] = false }
  opts.on("-h", "--help", "Show this help") do
    puts opts
    exit 0
  end
end

begin
  parser.parse!(ARGV)
  load_env_file(DEFAULT_ENV)
  config = JSON.parse(File.read(options.fetch(:config)))
  automation = IosReleaseAutomation.new(config)

  case command
  when "archive"
    automation.archive
  when "upload"
    automation.upload_archive
  when "apply"
    automation.apply_metadata(
      wait_build: options.fetch(:wait_build),
      wait_seconds: options.fetch(:wait_seconds),
      skip_review: options.fetch(:skip_review),
      skip_attach_build: options.fetch(:skip_attach_build),
      skip_beta: options.fetch(:skip_beta)
    )
  when "screenshots"
    automation.upload_screenshots(replace: options.fetch(:replace_screenshots, true))
  when "release"
    automation.archive
    automation.upload_archive
    automation.apply_metadata(
      wait_build: true,
      wait_seconds: options.fetch(:wait_seconds),
      skip_review: options.fetch(:skip_review),
      skip_attach_build: options.fetch(:skip_attach_build),
      skip_beta: options.fetch(:skip_beta)
    )
  when "status"
    automation.status
  else
    warn usage
    raise AppStoreConnectError, "Unknown command: #{command}"
  end
rescue AppStoreConnectError => e
  warn "ERROR: #{e.message}"
  exit 1
end
