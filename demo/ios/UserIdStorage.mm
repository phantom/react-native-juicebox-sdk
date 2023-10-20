#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(UserIdStorage, NSObject)

RCT_EXTERN_METHOD(
  register:(NSString *)userId
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
