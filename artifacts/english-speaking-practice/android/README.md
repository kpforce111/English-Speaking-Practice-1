# Rllora AI for Android

This is a Google Trusted Web Activity (TWA) project for `https://rllora.online/`.
It runs the existing website in a verified Android browser surface, so the
website and Android app use the same account, two-day trial, lessons, voice
practice, and server-side usage limits. It requires an internet connection for
AI practice and account features; it is not a separate offline native rewrite.

## Build and verify

The application ID is `online.rllora.app`. Confirm ownership of that ID before
the first Play Console upload; do not change it after publishing.

Use JDK 17 and an Android SDK with API 36 and build tools installed. In this
directory, run `./gradlew assembleDebug` for a test APK or
`./gradlew bundleRelease` to produce an unsigned release bundle. A release
requires a **private upload signing key** managed outside the repository; never
commit the key, passwords, or Play Console credentials. The generated
`twa-manifest.json` can be updated with Bubblewrap if the website manifest or
Android packaging changes.

Before treating this as a full-screen TWA, publish a Digital Asset Links file
at `https://rllora.online/.well-known/assetlinks.json` with the **actual
SHA-256 signing certificate fingerprint** used for the installed app and
package name `online.rllora.app`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "online.rllora.app",
    "sha256_cert_fingerprints": ["REPLACE_WITH_REAL_SIGNING_CERTIFICATE_SHA256"]
  }
}]
```

For installs from Google Play with Play App Signing, use the **Play app signing
certificate**, not merely the local upload key. The website must serve the
file as JSON without redirects. Until the matching file is live, Android
opens the site as a Custom Tab with a browser bar rather than as a verified
full-screen TWA. Test sign-in, microphone recording, audio playback, trial,
both learning boxes, and navigation on a real Android device before release.

## Payments and Play submission

The site's PhonePe checkout is currently paused pending merchant approval.
This Android project does not make payments live or claim to support Play
Billing. Do not submit it as a paid-subscription app before implementing
Google Play Billing for digital subscriptions and, if eligible, enrolling in
Google Play's India alternative-billing program and implementing its
required choice/reporting flow for PhonePe. A PhonePe transaction under that
program does **not** avoid Google's service fee; Google's published policy
says the fee is reduced by 4 percentage points. Users outside eligible
regions need the applicable Play-compliant purchase flow. Do not simply
link around Play Billing to collect digital-subscription payments.

Replit does not currently submit Android apps to Google Play. Once billing,
signing, asset links, privacy declarations, store listing, and device testing
are complete, the app owner uploads the signed Android App Bundle through
their own Play Console and completes Google's review. A Play Store listing URL
exists only after Google publishes the release.