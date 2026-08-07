import XCTest

final class GrookaiPhysicalSmokeUITests: XCTestCase {
  private let testFlight = XCUIApplication(bundleIdentifier: "com.apple.TestFlight")

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testDiscoverGrookaiUpdateState() throws {
    testFlight.launch()
    XCTAssertTrue(
      testFlight.wait(for: .runningForeground, timeout: 20),
      "TestFlight did not reach the foreground"
    )
    sleep(6)

    let screenshot = XCTAttachment(screenshot: testFlight.screenshot())
    screenshot.name = "testflight_grookai_update_preflight"
    screenshot.lifetime = .keepAlways
    add(screenshot)

    print("GROOKAI_TESTFLIGHT_HIERARCHY_BEGIN")
    print(testFlight.debugDescription)
    print("GROOKAI_TESTFLIGHT_HIERARCHY_END")
  }
}
