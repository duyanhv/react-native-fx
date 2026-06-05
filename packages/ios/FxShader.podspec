Pod::Spec.new do |s|
  s.name           = 'FxShader'
  s.version        = '1.0.0'
  s.summary        = 'A sample project summary'
  s.description    = 'A sample project description'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility, plus direct the compiled Metal library into
  # the FxShaderShaders resource bundle (loaded at runtime via makeDefaultLibrary).
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'MTL_LIBRARY_OUTPUT_DIR' => '${TARGET_BUILD_DIR}/FxShaderShaders.bundle',
  }

  # Curated .metal shaders compile into default.metallib inside FxShaderShaders.bundle.
  s.resource_bundles = {
    'FxShaderShaders' => ['Shaders/**/*.metal'],
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
