require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

Pod::Spec.new do |s|
  s.name         = "RNJuiceboxSdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.swift_version = '5'
  s.platforms     = { :ios => "13" }
  s.source        = { :git => "https://github.com/juicebox-systems/react-native-juicebox-sdk.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  # Specify the vendored libraries for different architectures
  s.vendored_libraries = [
    './target/aarch64-apple-ios/release/libjuicebox_sdk_ffi.a',
    './target/aarch64-apple-ios-sim/release/libjuicebox_sdk_ffi.a',
    './target/x86_64-apple-ios/release/libjuicebox_sdk_ffi.a'
  ]

  s.dependency "JuiceboxSdk"

  # Use install_modules_dependencies helper to install the dependencies if React Native version >=0.71.0.
  # See https://github.com/facebook/react-native/blob/febf6b7f33fdb4904669f99d795eba4c0f95d7bf/scripts/cocoapods/new_architecture.rb#L79.
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"

    # Don't install the dependencies when we run `pod install` in the old architecture.
    if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
      s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
      s.pod_target_xcconfig = {
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
        "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
      }
      s.dependency "React-Codegen"
      s.dependency "RCT-Folly"
      s.dependency "RCTRequired"
      s.dependency "RCTTypeSafety"
      s.dependency "ReactCommon/turbomodule/core"
    end
  end

  s.script_phase = {
    :name => 'Select appropriate libjuicebox_sdk_ffi.a',
    :script => <<-SCRIPT
      echo "PODS_ROOT is set to: ${PODS_ROOT}"
      echo "Current ARCHS: $ARCHS"
      echo "Current EFFECTIVE_PLATFORM_NAME: $EFFECTIVE_PLATFORM_NAME"
      if [[ "$ARCHS" == "x86_64" ]]; then
        if [ -f "${PODS_ROOT}/../../../node_modules/@phantom/react-native-juicebox-sdk/target/x86_64-apple-ios/release/libjuicebox_sdk_ffi.a" ]; then
          cp "${PODS_ROOT}/../../../node_modules/@phantom/react-native-juicebox-sdk/target/x86_64-apple-ios/release/libjuicebox_sdk_ffi.a" "${TARGET_BUILD_DIR}/${TARGET_NAME}.framework"
          echo "Copied x86_64 library"
        else
          echo "x86_64 library not found"
        fi
      elif [[ "$ARCHS" == "arm64" && "$EFFECTIVE_PLATFORM_NAME" == "-iphonesimulator" ]]; then
        if [ -f "${PODS_ROOT}/../../../node_modules/@phantom/react-native-juicebox-sdk/target/aarch64-apple-ios-sim/release/libjuicebox_sdk_ffi.a" ]; then
          cp "${PODS_ROOT}/../../../node_modules/@phantom/react-native-juicebox-sdk/target/aarch64-apple-ios-sim/release/libjuicebox_sdk_ffi.a" "${TARGET_BUILD_DIR}/${TARGET_NAME}.framework"
          echo "Copied arm64-sim library"
        else
          echo "arm64-sim library not found"
        fi
      elif [[ "$ARCHS" == "arm64" ]]; then
        if [ -f "${PODS_ROOT}/../../../node_modules/@phantom/react-native-juicebox-sdk/target/aarch64-apple-ios/release/libjuicebox_sdk_ffi.a" ]; then
          cp "${PODS_ROOT}/../../../node_modules/@phantom/react-native-juicebox-sdk/target/aarch64-apple-ios/release/libjuicebox_sdk_ffi.a" "${TARGET_BUILD_DIR}/${TARGET_NAME}.framework"
          echo "Copied arm64 library"
        else
          echo "arm64 library not found"
        fi
      else
        echo "No matching architecture found"
      fi
    SCRIPT
  }
end
