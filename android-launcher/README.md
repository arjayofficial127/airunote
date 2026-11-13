# Airunote Home for Android

A personal Android launcher for the realme C71. It uses the system wallpaper and
navigation controls, a small pin grid, and a searchable app drawer. It runs
alongside the stock launcher and does not need root.

- Swipe right on the first Home page to open the left panel. The default is
  Airunote, which opens inside the launcher. Sign in there once; its session is
  separate from Chrome. The panel displays the existing workspace.
- Swipe up from Home for all apps. Long-press an app in the drawer to pin it.
  Long-press the wallpaper and select **Left page** to choose an installed app
  or turn the swipe off.
- The four first-page icons match the C71 layout used to build this prototype.
  The second page starts empty. Stock-only widgets, notification badges and
  Phone Manager shortcuts are outside this launcher.
- Switch Home apps from **Settings → Apps → Default apps → Home app**. The
  stock launcher keeps its own layout. USB debugging is only needed for
  installing or testing the APK with ADB.

## Build and install

Use a JDK (17 or newer), Android SDK Platform 35 and Build Tools 35.0.0, plus
`openssl`, `zip`, and ADB. Set `ANDROID_SDK_ROOT` and run:

```sh
./android-launcher/build-apk.sh
adb install -r android-launcher/build/AirunoteHome.apk
adb shell am start -n com.airunote.home/.HomeActivity
```

The build makes a local signing key under
`${XDG_DATA_HOME:-$HOME/.local/share}/airunote-home/signing` the first time.
Back it up privately to install future updates without resetting launcher
settings or the Airunote session. You can set `AIRUNOTE_SIGNING_DIR` to use a
different private folder. The APK and key are kept out of Git.
