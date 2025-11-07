import java.util.Properties
import java.io.File
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.grookai_vault"
    // Pin stable SDK/build-tools to avoid aapt issues with preview/RC toolchains
    // Compile against 36 to satisfy recent plugins (camera, activity, etc.)
    compileSdk = 36
    ndkVersion = flutter.ndkVersion
    // Use stable build-tools. If only RC is installed, install 36.0.0 via the VS Code task.
    buildToolsVersion = "36.0.0"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.example.grookai_vault"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        // targetSdk can remain at prior stable while compiling against 36
        targetSdk = 34
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        // Configure OAuth redirect placeholders used by AndroidManifest
        // Defaults to Supabase Flutter scheme unless overridden via
        //  - android/local.properties: appAuthRedirectScheme, appAuthRedirectHost
        //  - or environment variables: APP_AUTH_REDIRECT_SCHEME, APP_AUTH_REDIRECT_HOST
        val lp = Properties()
        val f = rootProject.file("local.properties")
        if (f.exists()) {
            f.inputStream().use { lp.load(it) }
        }
        val scheme = (System.getenv("APP_AUTH_REDIRECT_SCHEME")
            ?: lp.getProperty("appAuthRedirectScheme")
            ?: "io.supabase.flutter")
        val host = (System.getenv("APP_AUTH_REDIRECT_HOST")
            ?: lp.getProperty("appAuthRedirectHost")
            ?: "login-callback")
        manifestPlaceholders += mapOf(
            "appAuthRedirectScheme" to scheme,
            "appAuthRedirectHost" to host,
        )
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    // Ensure ML Kit Text Recognition dependencies are present to satisfy
    // google_mlkit_text_recognition plugin references during R8 minification.
    // If you only need Latin, you can remove language-specific modules below.
    implementation("com.google.mlkit:text-recognition:16.0.0")
    implementation("com.google.mlkit:text-recognition-chinese:16.0.0")
    implementation("com.google.mlkit:text-recognition-japanese:16.0.0")
    implementation("com.google.mlkit:text-recognition-korean:16.0.0")
    implementation("com.google.mlkit:text-recognition-devanagari:16.0.0")
}

// Diagnostics: print detected build-tools and warn on preview/RC usage
gradle.projectsEvaluated {
    val sdk = System.getenv("ANDROID_HOME") ?: System.getenv("ANDROID_SDK_ROOT") ?: ""
    val bt = File("$sdk/build-tools")
    if (bt.exists()) {
        val dirs = bt.listFiles()?.map { it.name }?.sortedDescending() ?: emptyList()
        println(">> ANDROID build-tools present: $dirs")
        if (dirs.any { it.contains("36") && it.contains("rc", ignoreCase = true) }) {
            println("!! WARNING: Preview/RC build-tools detected. Please install build-tools;36.0.0 (stable).")
        }
    } else {
        println("!! WARNING: ANDROID_SDK not found; ensure build-tools 36.0.0 installed.")
    }
}
