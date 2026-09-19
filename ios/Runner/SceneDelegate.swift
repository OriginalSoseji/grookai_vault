import Flutter
import UIKit
import app_links

// Flutter forwards links delivered to an existing scene. app_links 6.x also
// needs the connection options from a newly created scene for cold launches.
class SceneDelegate: FlutterSceneDelegate {
  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    super.scene(scene, willConnectTo: session, options: connectionOptions)
    for context in connectionOptions.urlContexts {
      AppLinks.shared.handleLink(url: context.url)
    }
    for activity in connectionOptions.userActivities {
      guard activity.activityType == NSUserActivityTypeBrowsingWeb,
            let url = activity.webpageURL else { continue }
      AppLinks.shared.handleLink(url: url)
    }
  }
}
