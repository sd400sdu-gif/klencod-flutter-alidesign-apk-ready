// Extracted from the user-provided HTML. Empty code means the attachment listed the path but did not include its contents.
export type SourceFile = { path: string; title: string; language: string; code: string; available: boolean };
export const sourceFiles: SourceFile[] = [
  {
    "path": "app/build.gradle.kts",
    "title": "اعتماديات Android",
    "language": "kotlin",
    "code": "plugins {\n    id(\"com.android.application\")\n    id(\"org.jetbrains.kotlin.android\")\n    id(\"org.jetbrains.kotlin.plugin.serialization\")\n}\n\nandroid {\n    namespace = \"com.alidesign.studio\"\n    compileSdk = 35\n\n    defaultConfig {\n        applicationId = \"com.alidesign.studio\"\n        minSdk = 26\n        targetSdk = 35\n        versionCode = 1\n        versionName = \"1.0.0\"\n        vectorDrawables { useSupportLibrary = true }\n    }\n\n    compileOptions {\n        sourceCompatibility = JavaVersion.VERSION_17\n        targetCompatibility = JavaVersion.VERSION_17\n    }\n    kotlinOptions { jvmTarget = \"17\" }\n    buildFeatures { compose = true }\n    composeOptions { kotlinCompilerExtensionVersion = \"1.5.14\" }\n}\n\ndependencies {\n    implementation(platform(\"androidx.compose:compose-bom:2024.09.00\"))\n    implementation(\"androidx.compose.ui:ui\")\n    implementation(\"androidx.compose.material3:material3\")\n    implementation(\"androidx.compose.material:material-icons-extended\")\n    implementation(\"androidx.navigation:navigation-compose:2.8.0\")\n    implementation(\"androidx.activity:activity-compose:1.9.2\")\n\n    val media3Version = \"1.4.1\"\n    implementation(\"androidx.media3:media3-exoplayer:$media3Version\")\n    implementation(\"androidx.media3:media3-ui:$media3Version\")\n    implementation(\"androidx.media3:media3-transformer:$media3Version\")\n    implementation(\"androidx.media3:media3-effect:$media3Version\")\n    implementation(\"androidx.media3:media3-common:$media3Version\")\n\n    implementation(\"org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.1\")\n    implementation(\"io.coil-kt:coil-compose:2.7.0\")\n    implementation(\"com.google.android.gms:play-services-ads:23.3.0\")\n}",
    "available": true
  },
  {
    "path": "app/src/main/AndroidManifest.xml",
    "title": "أذونات Android",
    "language": "xml",
    "code": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\">\n\n    <uses-permission android:name=\"android.permission.READ_MEDIA_VIDEO\" />\n    <uses-permission android:name=\"android.permission.READ_MEDIA_IMAGES\" />\n    <uses-permission android:name=\"android.permission.READ_MEDIA_AUDIO\" />\n    <uses-permission android:name=\"android.permission.READ_EXTERNAL_STORAGE\" android:maxSdkVersion=\"32\" />\n    <uses-permission android:name=\"android.permission.RECORD_AUDIO\" />\n    <uses-permission android:name=\"android.permission.INTERNET\" />\n\n    <application\n        android:allowBackup=\"true\"\n        android:icon=\"@mipmap/ic_launcher\"\n        android:label=\"علي التصميم\"\n        android:roundIcon=\"@mipmap/ic_launcher_round\"\n        android:supportsRtl=\"true\"\n        android:theme=\"@style/Theme.Material3.Dark.NoActionBar\">\n\n        <meta-data\n            android:name=\"com.google.android.gms.ads.APPLICATION_ID\"\n            android:value=\"ca-app-pub-3940256099942544~3347511713\"/>\n\n        <activity\n            android:name=\".MainActivity\"\n            android:exported=\"true\"\n            android:configChanges=\"orientation|screenSize|screenLayout|keyboardHidden\"\n            android:windowSoftInputMode=\"adjustResize\">\n            <intent-filter>\n                <action android:name=\"android.intent.action.MAIN\" />\n                <category android:name=\"android.intent.category.LAUNCHER\" />\n            </intent-filter>\n        </activity>\n    </application>\n</manifest>",
    "available": true
  },
  {
    "path": "app/src/main/res/values/strings.xml",
    "title": "نصوص التطبيق",
    "language": "xml",
    "code": "",
    "available": false
  },
  {
    "path": "app/src/main/java/com/alidesign/studio/MainActivity.kt",
    "title": "توجيه الشاشات",
    "language": "kotlin",
    "code": "package com.alidesign.studio\n\nimport android.net.Uri\nimport android.os.Bundle\nimport androidx.activity.ComponentActivity\nimport androidx.activity.compose.setContent\nimport androidx.compose.foundation.layout.fillMaxSize\nimport androidx.compose.material3.Surface\nimport androidx.compose.runtime.Composable\nimport androidx.compose.ui.Modifier\nimport androidx.compose.ui.graphics.Color\nimport androidx.navigation.NavType\nimport androidx.navigation.compose.*\nimport androidx.navigation.navArgument\nimport com.alidesign.studio.ui.screens.*\n\nclass MainActivity : ComponentActivity() {\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        setContent {\n            Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF0F0F12)) {\n                AppNavigation()\n            }\n        }\n    }\n}\n\n@Composable\nfun AppNavigation() {\n    val navController = rememberNavController()\n\n    NavHost(navController = navController, startDestination = \"home\") {\n        composable(\"home\") {\n            HomeScreen(\n                onNavigateToVideo = { uri -> navController.navigate(\"video_editor/${Uri.encode(uri.toString())}\") },\n                onNavigateToPhoto = { uri -> navController.navigate(\"photo_editor/${Uri.encode(uri.toString())}\") },\n                onNavigateToAI = { navController.navigate(\"ai_studio\") }\n            )\n        }\n        composable(\n            route = \"video_editor/{mediaUri}\",\n            arguments = listOf(navArgument(\"mediaUri\") { type = NavType.StringType })\n        ) { entry ->\n            val uri = Uri.parse(Uri.decode(entry.arguments?.getString(\"mediaUri\") ?: \"\"))\n            VideoEditorScreen(videoUri = uri, onBack = { navController.popBackStack() })\n        }\n        composable(\n            route = \"photo_editor/{mediaUri}\",\n            arguments = listOf(navArgument(\"mediaUri\") { type = NavType.StringType })\n        ) { entry ->\n            val uri = Uri.parse(Uri.decode(entry.arguments?.getString(\"mediaUri\") ?: \"\"))\n            PhotoEditorScreen(imageUri = uri, onBack = { navController.popBackStack() })\n        }\n        composable(\"ai_studio\") {\n            AIStudioScreen(onBack = { navController.popBackStack() })\n        }\n    }\n}",
    "available": true
  },
  {
    "path": "app/src/main/java/com/alidesign/studio/domain/model/ProjectModels.kt",
    "title": "نماذج المشروع",
    "language": "kotlin",
    "code": "",
    "available": false
  },
  {
    "path": "app/src/main/java/com/alidesign/studio/engine/effects/EffectsShaders.kt",
    "title": "تأثيرات الصور",
    "language": "kotlin",
    "code": "",
    "available": false
  },
  {
    "path": "app/src/main/java/com/alidesign/studio/engine/export/VideoExportManager.kt",
    "title": "تصدير الفيديو المقترح",
    "language": "kotlin",
    "code": "package com.alidesign.studio.engine.export\n\nimport android.content.ContentValues\nimport android.content.Context\nimport android.net.Uri\nimport android.os.Build\nimport android.os.Environment\nimport android.provider.MediaStore\nimport androidx.media3.common.MediaItem\nimport androidx.media3.common.MimeTypes\nimport androidx.media3.common.util.UnstableApi\nimport androidx.media3.transformer.*\nimport kotlinx.coroutines.channels.awaitClose\nimport kotlinx.coroutines.flow.Flow\nimport kotlinx.coroutines.flow.callbackFlow\nimport java.io.File\n\nsealed class ExportState {\n    data class Progress(val percentage: Int) : ExportState()\n    data class Success(val outputUri: Uri) : ExportState()\n    data class Error(val message: String) : ExportState()\n}\n\n@UnstableApi\nclass VideoExportManager(private val context: Context) {\n\n    fun exportVideo(inputUri: Uri): Flow<ExportState> = callbackFlow {\n        val tempOutputFile = File(context.cacheDir, \"ali_export_${System.currentTimeMillis()}.mp4\")\n\n        val transformer = Transformer.Builder(context)\n            .setVideoMimeType(MimeTypes.VIDEO_H264)\n            .setAudioMimeType(MimeTypes.AUDIO_AAC)\n            .addListener(object : Transformer.Listener {\n                override fun onCompleted(composition: Composition, exportResult: ExportResult) {\n                    val savedUri = saveVideoToGallery(context, tempOutputFile)\n                    if (savedUri != null) {\n                        trySend(ExportState.Success(savedUri))\n                    } else {\n                        trySend(ExportState.Error(\"فشل حفظ الفيديو بالمعرض\"))\n                    }\n                    close()\n                }\n\n                override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {\n                    trySend(ExportState.Error(exportException.localizedMessage ?: \"خطأ أثناء التصدير\"))\n                    close()\n                }\n            })\n            .build()\n\n        transformer.start(EditedMediaItem.Builder(MediaItem.fromUri(inputUri)).build(), tempOutputFile.absolutePath)\n\n        val progressHolder = ProgressHolder()\n        val timer = java.util.Timer()\n        timer.scheduleAtFixedRate(object : java.util.TimerTask() {\n            override fun run() {\n                if (transformer.getProgress(progressHolder) == Transformer.PROGRESS_STATE_AVAILABLE) {\n                    trySend(ExportState.Progress(progressHolder.progress))\n                }\n            }\n        }, 200, 300)\n\n        awaitClose { timer.cancel() }\n    }\n\n    private fun saveVideoToGallery(context: Context, sourceFile: File): Uri? {\n        val filename = \"AliDesign_${System.currentTimeMillis()}.mp4\"\n        val values = ContentValues().apply {\n            put(MediaStore.Video.Media.DISPLAY_NAME, filename)\n            put(MediaStore.Video.Media.MIME_TYPE, \"video/mp4\")\n            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {\n                put(MediaStore.Video.Media.RELATIVE_PATH, \"${Environment.DIRECTORY_MOVIES}/AliDesign\")\n            }\n        }\n        val resolver = context.contentResolver\n        val uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values)\n        uri?.let { destUri ->\n            resolver.openOutputStream(destUri)?.use { out ->\n                sourceFile.inputStream().use { input -> input.copyTo(out) }\n            }\n            sourceFile.delete()\n            return destUri\n        }\n        return null\n    }\n}",
    "available": true
  },
  {
    "path": "app/src/main/java/com/alidesign/studio/ui/components/StylizedArabicText.kt",
    "title": "النص العربي المزخرف",
    "language": "kotlin",
    "code": "",
    "available": false
  },
  {
    "path": "app/src/main/java/com/alidesign/studio/ui/screens/HomeScreen.kt",
    "title": "الشاشة الرئيسية",
    "language": "kotlin",
    "code": "",
    "available": false
  },
  {
    "path": "app/src/main/java/com/alidesign/studio/ui/screens/VideoEditorScreen.kt",
    "title": "محرر الفيديو",
    "language": "kotlin",
    "code": "",
    "available": false
  },
  {
    "path": "app/src/main/java/com/alidesign/studio/ui/screens/PhotoEditorScreen.kt",
    "title": "محرر الصور",
    "language": "kotlin",
    "code": "",
    "available": false
  },
  {
    "path": "app/src/main/java/com/alidesign/studio/ui/screens/AIStudioScreen.kt",
    "title": "استوديو الذكاء الاصطناعي",
    "language": "kotlin",
    "code": "",
    "available": false
  },
  {
    "path": ".github/workflows/build.yml",
    "title": "GitHub Actions لبناء APK (اختياري)",
    "language": "yaml",
    "code": "name: Build APK\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - name: Set up JDK 17\n        uses: actions/setup-java@v3\n        with:\n          java-version: '17'\n          distribution: 'temurin'\n      - name: Build Debug APK\n        run: ./gradlew assembleDebug\n      - name: Upload Artifact\n        uses: actions/upload-artifact@v3\n        with:\n          name: AliDesign-APK\n          path: app/build/outputs/apk/debug/app-debug.apk",
    "available": true
  }
];
