param(
  [int]$Port = 8080
)

$env:PORT = "$Port"
$env:BUSCFTLA_SMTP_HOST = if ($env:BUSCFTLA_SMTP_HOST) { $env:BUSCFTLA_SMTP_HOST } else { "smtp.gmail.com" }
$env:BUSCFTLA_SMTP_PORT = if ($env:BUSCFTLA_SMTP_PORT) { $env:BUSCFTLA_SMTP_PORT } else { "465" }
$env:BUSCFTLA_SMTP_SSL = if ($env:BUSCFTLA_SMTP_SSL) { $env:BUSCFTLA_SMTP_SSL } else { "1" }

if (-not $env:BUSCFTLA_SMTP_USER) {
  $env:BUSCFTLA_SMTP_USER = Read-Host "Correo Gmail que enviará los códigos"
}
if (-not $env:BUSCFTLA_SMTP_PASSWORD) {
  $securePassword = Read-Host "Contraseña de aplicación Gmail (entrada oculta)" -AsSecureString
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try {
    $env:BUSCFTLA_SMTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $securePassword.Dispose()
  }
}
$env:BUSCFTLA_SMTP_FROM = if ($env:BUSCFTLA_SMTP_FROM) { $env:BUSCFTLA_SMTP_FROM } else { $env:BUSCFTLA_SMTP_USER }

Push-Location $PSScriptRoot
try {
  & python .\backend.py
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo iniciar BusCFTLA. Comprueba que Python 3 está instalado y disponible como 'python'."
  }
} finally {
  Pop-Location
  Remove-Item Env:BUSCFTLA_SMTP_PASSWORD -ErrorAction SilentlyContinue
}
