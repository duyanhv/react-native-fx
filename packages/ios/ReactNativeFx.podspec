Pod::Spec.new do |s|
  s.name           = 'ReactNativeFx'
  s.version        = '0.1.0'
  s.summary        = 'A native presentation runtime for React Native.'
  s.description    = 'Platform-native effects and motion — SwiftUI/Core Animation and Metal — ' \
                     'configured declaratively from JS. Native owns the frame loop.'
  s.author         = 'Duy Anh'
  s.homepage       = 'https://github.com/duyanhv/react-native-fx'
  s.license        = 'MIT'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: 'https://github.com/duyanhv/react-native-fx.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility, plus direct the compiled Metal library into
  # the FxShaders resource bundle (loaded at runtime via makeDefaultLibrary).
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'MTL_LIBRARY_OUTPUT_DIR' => '${TARGET_BUILD_DIR}/FxShaders.bundle',
  }

  # Curated .metal shaders compile into default.metallib inside FxShaders.bundle.
  s.resource_bundles = {
    'FxShaders' => ['Shaders/**/*.metal'],
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
