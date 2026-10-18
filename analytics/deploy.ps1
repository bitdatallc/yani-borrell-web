# Despliega la analitica (CloudWatch RUM + identidad Cognito de invitado) y escribe sus ids en src/analytics.js.
# Uso: pwsh ./analytics/deploy.ps1 [-Profile default]
param([string] $Profile = 'default')
$ErrorActionPreference = 'Stop'
$Region = 'eu-west-1'
$Stack  = 'yani-borrell-analytics'
$Root   = Split-Path $PSScriptRoot -Parent

aws cloudformation deploy --profile $Profile --region $Region --stack-name $Stack `
    --template-file (Join-Path $PSScriptRoot 'template.yaml') `
    --capabilities CAPABILITY_NAMED_IAM --no-fail-on-empty-changeset
if ($LASTEXITCODE -ne 0) { throw 'cloudformation deploy fallo' }

$outputs = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name $Stack `
    --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
$appId  = ($outputs | Where-Object OutputKey -eq 'AppMonitorId').OutputValue
$poolId = ($outputs | Where-Object OutputKey -eq 'IdentityPoolId').OutputValue

$file = Join-Path $Root 'src/analytics.js'
$js = Get-Content $file -Raw
$js = $js -replace "appMonitorId: '[^']*'", "appMonitorId: '$appId'"
$js = $js -replace "identityPoolId: '[^']*'", "identityPoolId: '$poolId'"
Set-Content -Path $file -Value $js -Encoding utf8NoBOM -NoNewline
Write-Host "AppMonitor: $appId  IdentityPool: $poolId (escritos en src/analytics.js)"
