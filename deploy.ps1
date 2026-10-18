# Despliega ./site a AWS Amplify Hosting (despliegue manual por zip, sin repo git conectado).
# Uso: pwsh ./deploy.ps1            (crea la app la primera vez y guarda su id en .amplify-app-id)
# Requiere AWS CLI con credenciales válidas (aws login).
$ErrorActionPreference = 'Stop'
$Root    = $PSScriptRoot
$Site    = Join-Path $Root 'site'
$IdFile  = Join-Path $Root '.amplify-app-id'
$AppName = 'yani-borrell-web'
$Branch  = 'main'
$Region  = 'eu-west-1'

function Invoke-Aws {
    $out = & aws @args --region $Region --output json
    if ($LASTEXITCODE -ne 0) { throw "aws $($args -join ' ') fallo (exit $LASTEXITCODE)" }
    if ($out) { return ($out | Out-String | ConvertFrom-Json) }
}

# Reglas: rutas WordPress antiguas -> home; resto desconocido -> home con 404
$rules = @(
    @{ source = '/sample-page/<*>'; target = '/'; status = '301' },
    @{ source = '/feed/<*>';        target = '/'; status = '301' },
    @{ source = '/wp-admin/<*>';    target = '/'; status = '301' },
    @{ source = '/wp-login.php';    target = '/'; status = '301' },
    @{ source = '/<*>';             target = '/index.html'; status = '404-200' }
) | ConvertTo-Json -Compress
$rulesFile = Join-Path ([IO.Path]::GetTempPath()) 'yb-amplify-rules.json'
Set-Content -Path $rulesFile -Value $rules -Encoding utf8NoBOM

if (Test-Path $IdFile) {
    $AppId = (Get-Content $IdFile -Raw).Trim()
    Invoke-Aws amplify update-app --app-id $AppId --custom-rules "file://$rulesFile" | Out-Null
} else {
    $app = Invoke-Aws amplify create-app --name $AppName --platform WEB --custom-rules "file://$rulesFile"
    $AppId = $app.app.appId
    Set-Content -Path $IdFile -Value $AppId -Encoding utf8NoBOM
    Invoke-Aws amplify create-branch --app-id $AppId --branch-name $Branch --stage PRODUCTION | Out-Null
    Write-Host "App Amplify creada: $AppId"
}

$zip = Join-Path ([IO.Path]::GetTempPath()) 'yb-site.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($Site, $zip)

$dep = Invoke-Aws amplify create-deployment --app-id $AppId --branch-name $Branch
Invoke-WebRequest -Uri $dep.zipUploadUrl -Method Put -InFile $zip -ContentType 'application/zip' | Out-Null
Invoke-Aws amplify start-deployment --app-id $AppId --branch-name $Branch --job-id $dep.jobId | Out-Null
Write-Host "Despliegue $($dep.jobId) iniciado: https://$Branch.$AppId.amplifyapp.com"

do {
    Start-Sleep -Seconds 5
    $status = (Invoke-Aws amplify get-job --app-id $AppId --branch-name $Branch --job-id $dep.jobId).job.summary.status
    Write-Host "  estado: $status"
} while ($status -in 'PENDING', 'PROVISIONING', 'RUNNING')
if ($status -ne 'SUCCEED') { throw "Despliegue termino en $status" }
