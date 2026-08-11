import XCTest

final class GrookaiSimulatorStateMatrixUITests: XCTestCase {
  private let appBundleIdentifier = "com.cesar.grookaivault"

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testSignedOutEntry() throws {
    let app = launchApp()

    XCTAssertTrue(
      app.staticTexts["Collect with purpose."].waitForExistence(timeout: 45)
    )
    XCTAssertTrue(app.buttons["Sign in with email"].exists)
    XCTAssertTrue(app.buttons["Explore cards"].exists)
    attach(app, name: "ios-simulator-signed-out")
  }

  func testPublicLoadingAndEmpty() throws {
    let app = launchApp()
    openPublicSearch(app)

    let search = app.textFields["Search in a sentence"]
    XCTAssertTrue(search.waitForExistence(timeout: 30))
    search.tap()
    search.typeText("Qzxwvplmntr999999")
    submitSearch(app)
    attach(app, name: "ios-simulator-search-loading")

    let noMatchingCards = app.staticTexts["No matching cards"]
    let noResultsYet = app.staticTexts["No results yet"]
    XCTAssertTrue(
      waitUntil(timeout: 45) {
        noMatchingCards.exists || noResultsYet.exists
      },
      "The impossible query did not settle into the bounded empty state."
    )
    attach(app, name: "ios-simulator-search-empty")
  }

  func testOfflineFallback() throws {
    let app = launchApp()
    openPublicSearch(app)
    runSearch(app, query: "Pikachu")

    let localFallback = app.staticTexts[
      "Search is temporarily limited. Showing local results when available."
    ]
    let emptyState = app.staticTexts["No results yet"]
    XCTAssertTrue(
      waitUntil(timeout: 45) {
        localFallback.exists || emptyState.exists
      },
      "Search did not display its bounded offline fallback or empty state."
    )
    attach(app, name: "ios-simulator-offline")
  }

  func testRecoveredPublicSearch() throws {
    let app = launchApp()
    openPublicSearch(app)
    runSearch(app, query: "Pikachu")

    let populatedCount = app.staticTexts.matching(
      NSPredicate(format: "label MATCHES[c] %@", "[0-9]+ cards?")
    ).firstMatch
    let populatedImage = app.images.matching(
      NSPredicate(format: "label CONTAINS[c] %@", "Pikachu")
    ).firstMatch
    XCTAssertTrue(
      waitUntil(timeout: 60) {
        populatedCount.exists || populatedImage.exists
      },
      "Search did not recover to a populated Pikachu result set."
    )
    attach(app, name: "ios-simulator-recovery")
  }

  func testPrivateAuthenticatedState() throws {
    let app = launchApp()
    if !app.buttons["Account"].waitForExistence(timeout: 8) {
      let environment = ProcessInfo.processInfo.environment
      guard
        let email = environment["GROOKAI_UI_EMAIL"],
        let password = environment["GROOKAI_UI_PASSWORD"],
        !email.isEmpty,
        !password.isEmpty
      else {
        XCTFail("No authenticated session or disposable UI credentials are available.")
        return
      }
      let emailEntry = app.buttons["Sign in with email"]
      XCTAssertTrue(emailEntry.waitForExistence(timeout: 30))
      emailEntry.tap()

      let emailField = app.textFields["Email"]
      let passwordField = app.secureTextFields["Password"].exists
        ? app.secureTextFields["Password"]
        : app.textFields["Password"]
      XCTAssertTrue(emailField.waitForExistence(timeout: 20))
      XCTAssertTrue(passwordField.waitForExistence(timeout: 20))
      emailField.tap()
      emailField.typeText(email)
      passwordField.tap()
      passwordField.typeText(password)

      let submit = app.buttons["Sign in with email"]
      XCTAssertTrue(submit.waitForExistence(timeout: 10))
      submit.tap()
    }

    XCTAssertTrue(app.buttons["Account"].waitForExistence(timeout: 75))
    dismissNotificationPermissionIfPresent(app)
    XCTAssertTrue(app.staticTexts["Pulse"].firstMatch.waitForExistence(timeout: 15))
    XCTAssertTrue(app.staticTexts["Caught up"].waitForExistence(timeout: 15))
    attach(app, name: "ios-simulator-private")
  }

  func testSignOutCleanup() throws {
    let app = launchApp()
    let account = app.buttons["Account"]
    if account.waitForExistence(timeout: 15) {
      account.tap()
      let signOut = app.buttons["Sign out"]
      for _ in 0..<16 where !signOut.isHittable {
        app.swipeUp()
        usleep(250_000)
      }
      XCTAssertTrue(signOut.exists)
      XCTAssertTrue(signOut.isHittable)
      signOut.tap()
    }

    XCTAssertTrue(app.buttons["Sign in with email"].waitForExistence(timeout: 45))
    attach(app, name: "ios-simulator-signed-out-restored")
  }

  private func launchApp() -> XCUIApplication {
    let app = XCUIApplication(bundleIdentifier: appBundleIdentifier)
    app.terminate()
    app.launch()
    XCTAssertTrue(app.wait(for: .runningForeground, timeout: 45))
    return app
  }

  private func openPublicSearch(_ app: XCUIApplication) {
    if app.textFields["Search in a sentence"].exists {
      return
    }
    let explore = app.buttons["Explore cards"]
    XCTAssertTrue(explore.waitForExistence(timeout: 30))
    explore.tap()
    XCTAssertTrue(
      app.textFields["Search in a sentence"].waitForExistence(timeout: 30)
    )
  }

  private func runSearch(_ app: XCUIApplication, query: String) {
    let search = app.textFields["Search in a sentence"]
    XCTAssertTrue(search.waitForExistence(timeout: 30))
    search.tap()
    if let currentValue = search.value as? String,
      !currentValue.isEmpty,
      currentValue != "Search in a sentence"
    {
      search.press(forDuration: 0.8)
      let selectAll = app.menuItems["Select All"]
      if selectAll.waitForExistence(timeout: 3) {
        selectAll.tap()
      }
    }
    search.typeText(query)
    submitSearch(app)
  }

  private func submitSearch(_ app: XCUIApplication) {
    let searchKey = app.keyboards.buttons["search"]
    if searchKey.exists {
      searchKey.tap()
    } else {
      app.typeText("\n")
    }
  }

  private func dismissNotificationPermissionIfPresent(_ app: XCUIApplication) {
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    let candidates = [
      app.buttons["Don’t Allow"],
      app.buttons["Don't Allow"],
      springboard.buttons["Don’t Allow"],
      springboard.buttons["Don't Allow"],
    ]
    for button in candidates where button.waitForExistence(timeout: 2) {
      button.tap()
      return
    }
  }

  private func waitUntil(
    timeout: TimeInterval,
    pollInterval: useconds_t = 250_000,
    condition: () -> Bool
  ) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      if condition() {
        return true
      }
      usleep(pollInterval)
    }
    return condition()
  }

  private func attach(_ app: XCUIApplication, name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
