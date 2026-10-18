# Build + despliegue de yani-borrell.com a AWS Amplify (despliegue manual por zip).
# Uso: pwsh ./deploy.ps1                    -> produccion (rama main, yani-borrell.com)
#      pwsh ./deploy.ps1 -Branch propuesta  -> rama de prueba (https://propuesta.<appId>.amplifyapp.com)
# Requiere AWS CLI con credenciales validas (aws login) en la cuenta de bitdatallc.
param([string] $Branch = 'main')
$ErrorActionPreference = 'Stop'
$Root   = $PSScriptRoot
$Region = 'eu-west-1'
$AppId  = (Get-Content (Join-Path $Root '.amplify-app-id') -Raw).Trim()
$Dist   = Join-Path $Root 'dist'

function Invoke-Aws {
    $out = & aws @args --region $Region --output json
    if ($LASTEXITCODE -ne 0) { throw "aws $($args -join ' ') fallo (exit $LASTEXITCODE)" }
    if ($out) { return ($out | Out-String | ConvertFrom-Json) }
}

Push-Location $Root
try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'build fallo' } } finally { Pop-Location }

# Reglas de la app (comunes a todas las ramas): URLs del WordPress antiguo -> secciones nuevas
$redirects = [ordered]@{
    '/about-me'                   = '/#sobre-mi'
    '/services'                   = '/#servicios'
    '/contact'                    = '/#contacto'
    '/asesoria-migratoria'        = '/#servicios'
    '/traducciones-y-apostillas'  = '/#servicios'
    '/preparacion-de-documentos'  = '/#servicios'
    '/homologacion-de-estudios'   = '/#servicios'
    '/elementor-page-313'         = '/#servicios'
    '/elementor-page-294'         = '/#servicios'
    '/sample-page'                = '/'
}
$rules = @()
foreach ($k in $redirects.Keys) {
    $rules += @{ source = $k;       target = $redirects[$k]; status = '301' }
    $rules += @{ source = "$k/<*>"; target = $redirects[$k]; status = '301' }
}
foreach ($p in '/wp-content/<*>', '/wp-includes/<*>', '/wp-admin/<*>', '/wp-login.php', '/xmlrpc.php', '/feed/<*>') {
    $rules += @{ source = $p; target = '/'; status = '301' }
}
# Cualquier otra ruta inexistente: página 404 propia (con estado 404)
$rules += @{ source = '/<*>'; target = '/404.html'; status = '404-200' }
$rulesFile = Join-Path ([IO.Path]::GetTempPath()) 'yb-amplify-rules.json'
Set-Content -Path $rulesFile -Value ($rules | ConvertTo-Json -Compress) -Encoding utf8NoBOM

# Cabeceras: caché larga para ficheros versionados/estables (el HTML sigue sin caché en el navegador)
# y cabeceras de seguridad. Si se añade un servicio externo, ampliar la CSP.
$csp = @(
    "default-src 'self'",
    "script-src 'self' https://client.rum.us-east-1.amazonaws.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://un4bc6qysdii4bvnm43nctzeti0eqhev.lambda-url.eu-west-1.on.aws https://dataplane.rum.eu-west-1.amazonaws.com https://cognito-identity.eu-west-1.amazonaws.com https://sts.eu-west-1.amazonaws.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests'
) -join '; '
$headers = @"
customHeaders:
  - pattern: '**'
    headers:
      - key: 'Strict-Transport-Security'
        value: 'max-age=31536000'
      - key: 'X-Content-Type-Options'
        value: 'nosniff'
      - key: 'Referrer-Policy'
        value: 'strict-origin-when-cross-origin'
      - key: 'X-Frame-Options'
        value: 'SAMEORIGIN'
      - key: 'Permissions-Policy'
        value: 'camera=(), microphone=(), geolocation=(), payment=()'
      - key: 'Content-Security-Policy'
        value: "$csp"
  - pattern: '/assets/**'
    headers:
      - key: 'Cache-Control'
        value: 'public, max-age=31536000, immutable'
  - pattern: '/fonts/**'
    headers:
      - key: 'Cache-Control'
        value: 'public, max-age=31536000, immutable'
  - pattern: '/img/**'
    headers:
      - key: 'Cache-Control'
        value: 'public, max-age=2592000'
  - pattern: '/favicon.ico'
    headers:
      - key: 'Cache-Control'
        value: 'public, max-age=2592000'
"@
$headersFile = Join-Path ([IO.Path]::GetTempPath()) 'yb-amplify-headers.yml'
Set-Content -Path $headersFile -Value $headers -Encoding utf8NoBOM
Invoke-Aws amplify update-app --app-id $AppId --custom-rules "file://$rulesFile" --custom-headers "file://$headersFile" | Out-Null

$branches = (Invoke-Aws amplify list-branches --app-id $AppId).branches.branchName
if ($branches -notcontains $Branch) {
    Invoke-Aws amplify create-branch --app-id $AppId --branch-name $Branch --stage DEVELOPMENT | Out-Null
    Write-Host "Rama $Branch creada"
}

$zip = Join-Path ([IO.Path]::GetTempPath()) "yb-$Branch.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($Dist, $zip)

$dep = Invoke-Aws amplify create-deployment --app-id $AppId --branch-name $Branch
Invoke-WebRequest -Uri $dep.zipUploadUrl -Method Put -InFile $zip -ContentType 'application/zip' | Out-Null
Invoke-Aws amplify start-deployment --app-id $AppId --branch-name $Branch --job-id $dep.jobId | Out-Null
do {
    Start-Sleep -Seconds 5
    $status = (Invoke-Aws amplify get-job --app-id $AppId --branch-name $Branch --job-id $dep.jobId).job.summary.status
    Write-Host "  estado: $status"
} while ($status -in 'PENDING', 'PROVISIONING', 'RUNNING')
if ($status -ne 'SUCCEED') { throw "Despliegue termino en $status" }
Write-Host ($(if ($Branch -eq 'main') { 'Publicado en produccion: https://yani-borrell.com' } else { "Publicado: https://$Branch.$AppId.amplifyapp.com" }))
