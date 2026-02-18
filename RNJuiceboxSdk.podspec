require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "RNJuiceboxSdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.swift_version = '5'
  s.platforms     = { :ios => "16.0" }
  s.source        = { :git => "https://github.com/juicebox-systems/react-native-juicebox-sdk.git", :tag => s.version.to_s }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "JuiceboxSdk", "0.3.2"

  # JuiceboxSdkFfi search paths so RNJuiceboxSdk can resolve the FFI module,
  # plus React-Core headers for the bridging header with use_frameworks! :linkage => :static (RN 0.81+).
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => [
      "$(inherited)",
      "$(PODS_ROOT)/JuiceboxSdk/swift/Sources/JuiceboxSdkFfi",
      "$(PODS_ROOT)/Headers/Public/React-Core",
      "$(PODS_ROOT)/Headers/Public"
    ].join(" "),
    "SWIFT_INCLUDE_PATHS" => "$(inherited) $(PODS_ROOT)/JuiceboxSdk/swift/Sources/JuiceboxSdkFfi"
  }

  # The JuiceboxSdk FFI static library must be linked into the final app binary.
  # pod_target_xcconfig OTHER_LDFLAGS don't propagate transitively with static frameworks,
  # so we use user_target_xcconfig to set them on the consuming app target.
  s.user_target_xcconfig = {
    "OTHER_LDFLAGS" => "$(PODS_ROOT)/JuiceboxSdk/artifacts/ffi/$(CARGO_BUILD_TARGET)/libjuicebox_sdk_ffi.a",
    "CARGO_BUILD_TARGET[sdk=iphonesimulator*][arch=arm64]" => "aarch64-apple-ios-sim",
    "CARGO_BUILD_TARGET[sdk=iphonesimulator*][arch=*]" => "x86_64-apple-ios",
    "CARGO_BUILD_TARGET[sdk=iphoneos*]" => "aarch64-apple-ios"
  }

  # Use install_modules_dependencies helper to install the dependencies if React Native version >=0.71.0.
  # See https://github.com/facebook/react-native/blob/febf6b7f33fdb4904669f99d795eba4c0f95d7bf/scripts/cocoapods/new_architecture.rb#L79.
  install_modules_dependencies(s)
end
