#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SecretIdStorage, NSObject)

RCT_EXTERN_METHOD(
  isAvailable:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  delete:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  register:(NSString *)secretId
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  recover:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
