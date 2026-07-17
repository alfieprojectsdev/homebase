# Gson uses reflection on model classes — keep the data package.
-keep class dev.alfieprojects.homebase.data.model.** { *; }

# Tink (via androidx.security-crypto) references errorprone annotations that
# are compileOnly upstream — they never exist at runtime, safe to ignore.
-dontwarn com.google.errorprone.annotations.**
