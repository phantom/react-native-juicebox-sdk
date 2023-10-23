#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNJuiceboxSdk, NSObject)

RCT_EXTERN_METHOD(
  register:(NSString *)configuration
  authentication:(NSDictionary *)authentication
  pin:(NSArray *)pin
  secret:(NSArray *)secret
  info:(NSArray *)info
  numGuesses:(NSInteger)numGuesses
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  recover:(NSString *)configuration
  authentication:(NSDictionary *)authentication
  pin:(NSArray *)pin
  info:(NSArray *)info
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  delete:(NSString *)configuration
  authentication:(NSDictionary *)authentication
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  createAuthentication:(NSArray *)realmIds
  signingParameters:(NSString *)signingParameters
  secretId:(NSString *)secret
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  randomSecretId:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
