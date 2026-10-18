# Despliega el formulario de contacto (Lambda + Function URL + SES) en la cuenta de bitdatallc
# y conecta su URL al sitio (tools/config.json + postprocess).
# Uso: pwsh ./contact-form/deploy.ps1 -Profile <perfil-admin-bitdatallc> [-ExtraOrigin https://main.xxxx.amplifyapp.com]
param(
    [Parameter(Mandatory)] [string] $Profile,
    [string] $ExtraOrigin = ''
)
$ErrorActionPreference = 'Stop'
$Region   = 'eu-west-1'
$Stack    = 'yani-borrell-contact-form'
$Identity = 'bitdatallc.com'
$Root     = Split-Path $PSScriptRoot -Parent

$origins = 'https://yani-borrell.com,https://www.yani-borrell.com,http://localhost:8765'
if ($ExtraOrigin) { $origins += ",$ExtraOrigin" }

aws cloudformation deploy --profile $Profile --region $Region --stack-name $Stack `
    --template-file (Join-Path $PSScriptRoot 'template.yaml') `
    --capabilities CAPABILITY_NAMED_IAM `
    --parameter-overrides "AllowedOrigins=$origins" --no-fail-on-empty-changeset
if ($LASTEXITCODE -ne 0) { throw 'cloudformation deploy fallo' }

$outputs = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name $Stack `
    --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
$url  = ($outputs | Where-Object OutputKey -eq 'FunctionUrl').OutputValue
$role = ($outputs | Where-Object OutputKey -eq 'RoleArn').OutputValue

# Politica de envio en la identidad SES (CloudFormation no tiene recurso para esto; Rubrica la necesito igual)
$policy = @{
    Version   = '2012-10-17'
    Statement = @(@{
        Effect    = 'Allow'
        Principal = @{ AWS = $role }
        Action    = @('ses:SendEmail', 'ses:SendRawEmail')
        Resource  = "arn:aws:ses:${Region}:$((aws sts get-caller-identity --profile $Profile --query Account --output text)):identity/$Identity"
    })
} | ConvertTo-Json -Depth 5 -Compress
$policyFile = Join-Path ([IO.Path]::GetTempPath()) 'yb-ses-policy.json'
Set-Content -Path $policyFile -Value $policy -Encoding utf8NoBOM
aws sesv2 create-email-identity-policy --profile $Profile --region $Region --email-identity $Identity `
    --policy-name AllowYaniBorrellContactForm --policy "file://$policyFile" 2>$null
if ($LASTEXITCODE -ne 0) {
    aws sesv2 update-email-identity-policy --profile $Profile --region $Region --email-identity $Identity `
        --policy-name AllowYaniBorrellContactForm --policy "file://$policyFile"
    if ($LASTEXITCODE -ne 0) { throw 'no se pudo poner la politica de la identidad SES' }
}

# Conectar la URL al sitio
$cfgPath = Join-Path $Root 'tools/config.json'
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$cfg.contactFormUrl = $url
$cfg | ConvertTo-Json | Set-Content -Path $cfgPath -Encoding utf8NoBOM
node (Join-Path $Root 'tools/postprocess.mjs')

Write-Host "Function URL: $url"
Write-Host 'Siguiente: pwsh ./deploy.ps1 para publicar el sitio con el formulario conectado.'
