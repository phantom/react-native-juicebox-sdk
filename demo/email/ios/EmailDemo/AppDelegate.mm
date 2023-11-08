#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"EmailDemo";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};


  BOOL success = [super application:application didFinishLaunchingWithOptions:launchOptions];
  if (success) {
    // Modify as needed to match the main color of your splash.
    self.window.rootViewController.view.backgroundColor = [UIColor colorWithRed:28.0/255.0 green:28.0/255.0 blue:28.0/255.0 alpha:1.0];
  }
  return success;
}

-(BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:app openURL:url options:options];
//  return [self handleURL:url];
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
//  if (![userActivity.activityType isEqualToString:NSUserActivityTypeBrowsingWeb] || userActivity.webpageURL == nil) {
//    return NO;
//  }
//
//  return [self handleURL:userActivity.webpageURL];
}
//
//- (BOOL)handleURL:(NSURL *)url {
//  if (![url.path isEqualToString:@"/app/confirm"]) {
//    return NO;
//  }
//
//  NSURLComponents *components = [NSURLComponents componentsWithURL:url resolvingAgainstBaseURL:NO];
//  for (NSURLQueryItem *item in components.queryItems) {
//    if (![item.name isEqualToString:@"token"]) continue;
//    _emailToken = item.value;
//    break;
//  }
//
//  self.emailTokenDidUpdate(self.emailToken);
//
//  return YES;
//}
//
//- (void)setEmailTokenDidUpdate:(void (^)(NSString * _Nullable))emailTokenDidUpdate
//{
//  _emailTokenDidUpdate = emailTokenDidUpdate;
//  if (self.emailToken) {
//    emailTokenDidUpdate(self.emailToken);
//  }
//}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
