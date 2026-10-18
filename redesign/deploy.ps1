# Publica la propuesta (dist/) en una rama de prueba de la app Amplify de yani-borrell.com.
# No toca la rama main (la web en producción).
# Uso: pwsh ./redesign/deploy.ps1 [-Branch propuesta]
param([string] $Branch = 'propuesta')
$ErrorActionPreference = 'Stop'
$Region = 'eu-west-1'
$AppId  = (Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) '.amplify-app-id') -Raw).Trim()
$Dist   = Join-Path $PSScriptRoot 'dist'

function Invoke-Aws {
    $out = & aws @args --region $Region --output json
    if ($LASTEXITCODE -ne 0) { throw "aws $($args -join ' ') fallo (exit $LASTEXITCODE)" }
    if ($out) { return ($out | Out-String | ConvertFrom-Json) }
}

Push-Location $PSScriptRoot
try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'build fallo' } } finally { Pop-Location }

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
Write-Host "Publicado: https://$Branch.$AppId.amplifyapp.com"
