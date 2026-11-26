package com.revantram.rvpdf;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new AndroidDownloader(this), "AndroidDownloader");
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function(){ return window.__rvPdfHandleBack ? window.__rvPdfHandleBack() : 'exit'; })()",
                        value -> {
                            if ("\"handled\"".equals(value)) {
                                return;
                            }
                            runOnUiThread(() -> {
                                setEnabled(false);
                                getOnBackPressedDispatcher().onBackPressed();
                                setEnabled(true);
                            });
                        }
                    );
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }

    private static class PendingDownload {
        OutputStream outputStream;
        Uri mediaUri;
        String fileName;
    }

    public static class AndroidDownloader {
        private final BridgeActivity activity;
        private final Map<String, PendingDownload> activeDownloads = new HashMap<>();

        public AndroidDownloader(BridgeActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public String startDownload(String fileName, String mimeType) {
            try {
                String id = UUID.randomUUID().toString();
                PendingDownload pd = new PendingDownload();
                pd.fileName = fileName;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType != null ? mimeType : "application/pdf");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/RV-PDF");
                    values.put(MediaStore.Downloads.IS_PENDING, 1);

                    ContentResolver resolver = activity.getContentResolver();
                    Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) return "";
                    pd.mediaUri = uri;
                    pd.outputStream = resolver.openOutputStream(uri);
                } else {
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File appDir = new File(downloadsDir, "RV-PDF");
                    if (!appDir.exists()) appDir.mkdirs();
                    File outFile = new File(appDir, fileName);
                    pd.outputStream = new FileOutputStream(outFile);
                }

                if (pd.outputStream == null) return "";
                activeDownloads.put(id, pd);
                return id;
            } catch (Exception e) {
                e.printStackTrace();
                return "";
            }
        }

        @JavascriptInterface
        public boolean appendChunk(String downloadId, String base64Chunk) {
            PendingDownload pd = activeDownloads.get(downloadId);
            if (pd == null || pd.outputStream == null) return false;
            try {
                byte[] bytes = Base64.decode(base64Chunk, Base64.DEFAULT);
                pd.outputStream.write(bytes);
                return true;
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }

        @JavascriptInterface
        public boolean finishDownload(String downloadId) {
            PendingDownload pd = activeDownloads.remove(downloadId);
            if (pd == null) return false;
            try {
                if (pd.outputStream != null) {
                    pd.outputStream.flush();
                    pd.outputStream.close();
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pd.mediaUri != null) {
                    ContentValues update = new ContentValues();
                    update.put(MediaStore.Downloads.IS_PENDING, 0);
                    activity.getContentResolver().update(pd.mediaUri, update, null, null);
                }
                final String savedName = pd.fileName;
                activity.runOnUiThread(() ->
                    Toast.makeText(activity, "Saved to Downloads/RV-PDF/" + savedName, Toast.LENGTH_LONG).show()
                );
                return true;
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }

        @JavascriptInterface
        public void cancelDownload(String downloadId) {
            PendingDownload pd = activeDownloads.remove(downloadId);
            if (pd == null) return;
            try {
                if (pd.outputStream != null) {
                    pd.outputStream.close();
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pd.mediaUri != null) {
                    activity.getContentResolver().delete(pd.mediaUri, null, null);
                }
            } catch (Exception ignored) {}
        }
    }
}
