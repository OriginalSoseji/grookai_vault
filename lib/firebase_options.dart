import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError('Firebase is not configured for web.');
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
      case TargetPlatform.fuchsia:
        throw UnsupportedError('Firebase is not configured for this platform.');
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyA80cGgpzUt2pZ2ztuM_6fZ9pEfrKKRVc8',
    appId: '1:570335898918:android:c0bb2305a52ce3be4ce5e7',
    messagingSenderId: '570335898918',
    projectId: 'grookai-vault-6bbd1',
    storageBucket: 'grookai-vault-6bbd1.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBfKayhHhrNirI3sRQ1vDnLiro4gVX0Q4M',
    appId: '1:570335898918:ios:8e9bbb682488467e4ce5e7',
    messagingSenderId: '570335898918',
    projectId: 'grookai-vault-6bbd1',
    storageBucket: 'grookai-vault-6bbd1.firebasestorage.app',
    iosBundleId: 'com.cesar.grookaivault',
  );
}
