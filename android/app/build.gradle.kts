import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}
val releaseSigningRequested = gradle.startParameter.taskNames.any {
    it.lowercase().contains("release")
}

fun explicitBooleanFlag(name: String, value: String?): Boolean =
    when (value?.trim()?.lowercase()) {
        null, "", "false" -> false
        "true" -> true
        else -> throw GradleException("$name must be exactly true or false.")
    }

val lockedAcceptanceProperty =
    providers.gradleProperty("grookaiLockedAcceptance").orNull
val lockedAcceptanceEnvironment =
    providers.environmentVariable("GROOKAI_LOCKED_ACCEPTANCE").orNull
val lockedAcceptanceFromProperty =
    explicitBooleanFlag("grookaiLockedAcceptance", lockedAcceptanceProperty)
val lockedAcceptanceFromEnvironment =
    explicitBooleanFlag(
        "GROOKAI_LOCKED_ACCEPTANCE",
        lockedAcceptanceEnvironment,
    )

if (
    lockedAcceptanceProperty != null &&
    lockedAcceptanceEnvironment != null &&
    lockedAcceptanceFromProperty != lockedAcceptanceFromEnvironment
) {
    throw GradleException(
        "grookaiLockedAcceptance and GROOKAI_LOCKED_ACCEPTANCE disagree.",
    )
}

val lockedAcceptanceRequested =
    lockedAcceptanceFromProperty || lockedAcceptanceFromEnvironment

fun signingValue(name: String): String? {
    val fromProperty = keystoreProperties.getProperty(name)?.trim()
    if (!fromProperty.isNullOrEmpty()) return fromProperty
    return System.getenv(name)?.trim()?.takeIf { it.isNotEmpty() }
}

android {
    namespace = "com.grookai.vault"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.grookai.vault"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        buildConfigField("boolean", "LOCKED_ACCEPTANCE_ENABLED", "false")
    }

    signingConfigs {
        create("release") {
            val storeFilePath = signingValue("ANDROID_KEYSTORE_PATH")
            val storePasswordValue = signingValue("ANDROID_KEYSTORE_PASSWORD")
            val keyAliasValue = signingValue("ANDROID_KEY_ALIAS")
            val keyPasswordValue = signingValue("ANDROID_KEY_PASSWORD")

            if (releaseSigningRequested && (storeFilePath == null || storePasswordValue == null || keyAliasValue == null || keyPasswordValue == null)) {
                throw GradleException("Release signing is required. Provide ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, and ANDROID_KEY_PASSWORD via CI secrets or android/key.properties.")
            }

            if (storeFilePath != null && storePasswordValue != null && keyAliasValue != null && keyPasswordValue != null) {
                storeFile = file(storeFilePath)
                storePassword = storePasswordValue
                keyAlias = keyAliasValue
                keyPassword = keyPasswordValue
            }
        }
    }

    buildTypes {
        debug {
            if (lockedAcceptanceRequested) {
                applicationIdSuffix = ".lockedacceptance"
                versionNameSuffix = "-locked-acceptance"
                buildConfigField(
                    "boolean",
                    "LOCKED_ACCEPTANCE_ENABLED",
                    "true",
                )
                resValue(
                    "string",
                    "app_name",
                    "Grookai Vault Locked Acceptance",
                )
            }
        }
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    val cameraxVersion = "1.5.3"
    implementation("androidx.camera:camera-core:$cameraxVersion")
    implementation("androidx.camera:camera-camera2:$cameraxVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraxVersion")
    implementation("androidx.camera:camera-view:$cameraxVersion")
}
