param(
  [int]$Port = 8080,
  [string]$RootDir = $PSScriptRoot
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  BusCFTLA Web Server iniciado en http://127.0.0.1:$Port/ " -ForegroundColor Green
Write-Host "  Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".ico"  = "image/x-icon"
  ".webmanifest" = "application/manifest+json"
}

try {
  while ($listener.IsListening) {
    try {
      $context = $listener.GetContext()
      $request = $context.Request
      $response = $context.Response

      $urlPath = $request.Url.LocalPath
      if ($urlPath -eq "/" -or [string]::IsNullOrEmpty($urlPath)) {
        $urlPath = "/index.html"
      }

      $filePath = Join-Path $RootDir ($urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar))

      if (Test-Path -Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
        
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentType = $mime
        $response.ContentLength64 = $bytes.Length
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Cache-Control", "no-cache")
        $response.StatusCode = 200

        if ($request.HttpMethod -ne "HEAD") {
          $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
      } else {
        $notFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.StatusCode = 404
        $response.ContentType = "text/plain; charset=utf-8"
        $response.ContentLength64 = $notFoundMsg.Length
        if ($request.HttpMethod -ne "HEAD") {
          $response.OutputStream.Write($notFoundMsg, 0, $notFoundMsg.Length)
        }
      }
      $response.OutputStream.Close()
    } catch {
      Write-Host "Request error: $_" -ForegroundColor Red
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
