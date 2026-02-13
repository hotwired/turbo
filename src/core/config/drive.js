export const drive = {
  enabled: true,
  progressBarDelay: 500,
  prefetchDelay: 100,
  unvisitableExtensions: new Set(
    [
      ".7z", ".aac", ".apk", ".avi", ".bmp", ".bz2", ".css", ".csv", ".deb", ".dmg", ".doc",
      ".docx", ".exe", ".gif", ".gz", ".heic", ".heif", ".ico", ".iso", ".jpeg", ".jpg",
      ".js", ".json", ".m4a", ".mkv", ".mov", ".mp3", ".mp4", ".mpeg", ".mpg", ".msi",
      ".ogg", ".ogv", ".pdf", ".pkg", ".png", ".ppt", ".pptx", ".rar", ".rtf",
      ".svg", ".tar", ".tif", ".tiff", ".txt", ".wav", ".webm", ".webp", ".wma", ".wmv",
      ".xls", ".xlsx", ".xml", ".zip"
    ]
  )
}
