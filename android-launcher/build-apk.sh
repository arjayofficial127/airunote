#!/usr/bin/env bash
set -euo pipefail

here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
sdk="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
tools="${ANDROID_BUILD_TOOLS:-$sdk/build-tools/35.0.0}"
platform="${ANDROID_PLATFORM_JAR:-$sdk/platforms/android-35/android.jar}"
export PATH="${JAVA_HOME:+$JAVA_HOME/bin:}$PATH"

keydir="${AIRUNOTE_SIGNING_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/airunote-home/signing}"
out="${AIRUNOTE_BUILD_DIR:-$here/build}"
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT

mkdir -p "$out" "$work/classes" "$work/dex"
test -r "$platform"
for tool in aapt2 d8 zipalign apksigner; do test -x "$tools/$tool"; done

"$tools/aapt2" compile --dir "$here/src/main/res" -o "$work/resources.zip"
"$tools/aapt2" link -I "$platform" --manifest "$here/src/main/AndroidManifest.xml" \
  --java "$work" --min-sdk-version 30 --target-sdk-version 35 \
  --version-code 6 --version-name 1.5 -o "$work/unaligned.apk" "$work/resources.zip"
mapfile -d '' sources < <(find "$here/src/main/java" "$work/com" -name '*.java' -print0)
javac --release 17 -classpath "$platform" -d "$work/classes" "${sources[@]}"
jar cf "$work/classes.jar" -C "$work/classes" .
"$tools/d8" --release --min-api 30 --lib "$platform" --output "$work/dex" "$work/classes.jar"
(cd "$work/dex" && zip -q "$work/unaligned.apk" classes.dex)
"$tools/zipalign" -p -f 4 "$work/unaligned.apk" "$work/aligned.apk"

umask 077
mkdir -p "$keydir"
if [[ ! -f "$keydir/home.p12" ]]; then
  openssl rand -hex 32 > "$keydir/password"
  keytool -genkeypair -keystore "$keydir/home.p12" -storepass:file "$keydir/password" \
    -storetype PKCS12 -alias airunote-home -keyalg RSA -keysize 3072 -validity 10000 \
    -dname 'CN=Airunote Home, O=Airunote'
fi
"$tools/apksigner" sign --ks "$keydir/home.p12" --ks-key-alias airunote-home \
  --ks-pass "file:$keydir/password" --out "$work/AirunoteHome.apk" "$work/aligned.apk"
"$tools/apksigner" verify --verbose "$work/AirunoteHome.apk"
install -m 644 "$work/AirunoteHome.apk" "$out/AirunoteHome.apk"
printf '%s\n' "$out/AirunoteHome.apk"
