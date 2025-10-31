# PromptSaver Android Keyboard

Native Android IME that mirrors the PromptSaver mobile app experience while exposing a dedicated voice transcription action.

## Status

- ✅ UI shell implemented in Jetpack Compose with AOSP-aligned spacing, key geometry, and Material 3 dynamic color support.
- ✅ Voice button state machine stubbed with mock transcription pipeline (placeholder text insertion).
- ⏳ Integrate foreground audio service + Soniox streaming client shared with the Expo host app.
- ⏳ Wire symbol/shift layouts, suggestion strip data, and authenticated settings.

## Module Layout

```
packages/android-keyboard/
├─ build.gradle.kts        # Gradle convention plugins
├─ settings.gradle.kts     # Includes :keyboard app module
└─ keyboard/
   ├─ build.gradle.kts     # Android application module with Compose + Material3
   ├─ src/main/
   │  ├─ AndroidManifest.xml
   │  ├─ java/com/promptsaver/keyboard/
   │  │  ├─ service/PromptSaverKeyboardService.kt
   │  │  └─ ui/theme/PromptSaverKeyboardTheme.kt
   │  └─ res/…             # IME metadata, vector assets, localized strings
   └─ proguard-rules.pro
```

## Design Guidelines

- Key caps follow Google Sans sizing (rounded 10 dp corners, 6 dp gutters) to stay close to the stock Pixel keyboard while leaving room for branded accents.
- Suggestion row uses a neutral pill surface; hook Replicache predictions here later.
- Voice button occupies a floating 72 dp pill with copy updates for idle/recording/processing/muted states. Long-press toggles mute (planned to disable hot mic + show privacy notice).
- Material 3 dynamic colors automatically pick up the user's wallpaper palette (Android 12+). Pre-12 devices fall back to a bespoke light/dark palette aligned with the web brand.
- Haptic/animation hooks are ready: connect to `HapticFeedbackConstants.KEYBOARD_TAP` and `animate*` transitions when wiring the audio pipeline.

## Integration Notes

1. **Build:** install Gradle 8.4 or newer and run `./gradlew :keyboard:assembleDebug` from this directory. (The repository does not ship a wrapper yet; installable Gradle is required.)
2. **Expo Host App:** after running `expo prebuild`, add this module as a Gradle included build or import its source sets directly into the bare project. The IME will live alongside the main React Native activity but ship as a separate service.
3. **Auth & Storage:** reuse the secure credential broker planned for the keyboard extensions. Expose a `ContentProvider` in the Expo app that grants the IME access to a short-lived JWT and the most recent transcript buffer.
4. **Audio Service:** create a foreground `TranscriptionService` inside the host app, exposing Binder APIs for `startRecording`, `stopRecording`, and `observeTranscript`. The IME will bind on demand and update Compose state with streaming results.
5. **Release Configuration:** update `AndroidManifest.xml` metadata (`imeSubtypeLocale`, icons, label) once locales + branding are finalized. Remember to declare the service in the release manifest of the host app as well.

## Next Steps

1. Add Gradle wrapper + CI task to lint and assemble the module.
2. Implement the `TranscriptionService` and connect it to the existing Soniox client from `packages/core`.
3. Expand layout variations (numeric, symbols) and support one-handed or split keyboard widths.
4. Sync theming tokens with the design system so colors stay in lockstep with the Expo app.
