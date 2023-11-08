//
//  AppDelegate.swift
//  EmailDemo
//
//  Created by Nora Trapp on 11/6/23.
//

import Foundation

#if DEBUG
  import SimulatorStatusMagic
#endif

@UIApplicationMain
final class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
  ) -> Bool {
    moduleName = "Juicebox"
    initialProps = [:]

#if DEBUG
  SDStatusBarManager.sharedInstance()?.enableOverrides()
#endif

    let success = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    return success
  }

  override func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
