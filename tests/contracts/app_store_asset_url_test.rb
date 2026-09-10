require 'minitest/autorun'

source_path = ARGV.shift || File.expand_path('../../scripts/app_store_connect/ios_release_automation.rb', __dir__)
definitions, separator, = File.read(source_path).partition("\noptions = {")
abort 'Automation definition boundary changed' if separator.empty?
eval(definitions, TOPLEVEL_BINDING, source_path)

class AppStoreAssetUrlTest < Minitest::Test
  def setup
    @automation = IosReleaseAutomation.new({})
  end

  def test_apple_storage_hosts
    %w[northamerica-1.object-storage.apple.com eu.blobstore.apple.com].each do |host|
      uri = @automation.send(:validated_asset_upload_uri, "https://#{host}/asset?signature=test")
      assert_equal host, uri.host
    end
  end

  def test_untrusted_and_credential_destinations
    [
      'http://northamerica-1.object-storage.apple.com/asset',
      'https://northamerica-1.object-storage.apple.com:444/asset',
      'https://user:pass@northamerica-1.object-storage.apple.com/asset',
      'https://object-storage.apple.com/asset',
      'https://evilobject-storage.apple.com/asset',
      'https://northamerica-1.object-storage.apple.com.evil.test/asset',
      'https://blobstore.apple.com.evil.test/asset',
      'https://127.0.0.1/asset',
      'file:///private/asset',
      'not a URI'
    ].each do |url|
      assert_raises(AppStoreConnectError, url) { @automation.send(:validated_asset_upload_uri, url) }
    end
  end
end
