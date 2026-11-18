param([int]$port = 8080)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()
Write-Output "HTTP server listening on http://127.0.0.1:$port/"
$listener.Stop()
Write-Output "Stopped OK"
