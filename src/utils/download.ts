export interface DownloadResult {
  success: boolean;
  message: string;
}

interface AndroidDownloaderBridge {
  startDownload: (fileName: string, mimeType: string) => string;
  appendChunk: (downloadId: string, base64Chunk: string) => boolean;
  finishDownload: (downloadId: string) => boolean;
  cancelDownload: (downloadId: string) => void;
}

declare global {
  interface Window {
    AndroidDownloader?: AndroidDownloaderBridge;
  }
}

const CHUNK_SIZE = 512 * 1024; // 512 KB chunks for safe memory usage on mobile

const blobSliceToBase64 = (slice: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(slice);
  });
};

/**
 * Downloads a Blob or Object URL reliably across both Capacitor Android APK
 * (via native MediaStore Downloads bridge) and standard web browsers.
 */
export const downloadBlobOrUrl = async (
  source: Blob | string,
  fileName: string,
  mimeType = 'application/pdf',
  onProgress?: (percent: number) => void
): Promise<DownloadResult> => {
  const blob =
    typeof source === 'string'
      ? await (await fetch(source)).blob()
      : source;

  // Native Android Capacitor Bridge
  if (window.AndroidDownloader) {
    const bridge = window.AndroidDownloader;
    const downloadId = bridge.startDownload(fileName, mimeType);
    if (!downloadId) {
      throw new Error('Could not initialize native Android download.');
    }

    try {
      const totalSize = blob.size;
      let offset = 0;

      while (offset < totalSize) {
        const end = Math.min(offset + CHUNK_SIZE, totalSize);
        const slice = blob.slice(offset, end);
        const base64 = await blobSliceToBase64(slice);
        const ok = bridge.appendChunk(downloadId, base64);
        if (!ok) {
          throw new Error('Failed while writing file chunk to Downloads.');
        }
        offset = end;
        onProgress?.(Math.round((offset / totalSize) * 100));
      }

      const finished = bridge.finishDownload(downloadId);
      if (!finished) {
        throw new Error('Failed to finalize file in Downloads.');
      }

      return {
        success: true,
        message: `Saved to Downloads/RV-PDF/${fileName}`,
      };
    } catch (err) {
      bridge.cancelDownload(downloadId);
      throw err;
    }
  }

  // Fallback for standard web browsers
  const url = typeof source === 'string' ? source : URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    if (typeof source !== 'string') {
      URL.revokeObjectURL(url);
    }
  }, 1500);

  return {
    success: true,
    message: `Downloading ${fileName}...`,
  };
};
