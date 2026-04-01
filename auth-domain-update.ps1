$projectId = "basket-coach-1cdd5"
$domainToAdd = "basket-data.vercel.app"
$p = "$env:USERPROFILE\\.config\\configstore\\firebase-tools.json"
if (-not (Test-Path $p)) { Write-Output "ERROR: firebase-tools.json no encontrado"; exit 1 }
$cfg = Get-Content $p -Raw | ConvertFrom-Json
$token = [string]$cfg.tokens.access_token
if ([string]::IsNullOrWhiteSpace($token)) { Write-Output "ERROR: token vacío"; exit 1 }
$headers = @{ Authorization = "Bearer $token" }
$url = "https://identitytoolkit.googleapis.com/admin/v2/projects/$projectId/config"
try {
  $initial = Invoke-RestMethod -Method GET -Uri $url -Headers $headers -ErrorAction Stop
} catch {
  Write-Output ("ERROR_GET_INICIAL: " + $_.Exception.Message)
  exit 1
}
$domains = @($initial.authorizedDomains)
$had = $domains -contains $domainToAdd
if (-not $had) {
  $newDomains = @($domains + $domainToAdd | Select-Object -Unique)
  $body = @{ authorizedDomains = $newDomains } | ConvertTo-Json -Depth 4
  $patchUrl = "$url?updateMask=authorizedDomains"
  try {
    Invoke-RestMethod -Method PATCH -Uri $patchUrl -Headers $headers -ContentType "application/json" -Body $body -ErrorAction Stop | Out-Null
  } catch {
    Write-Output ("ERROR_PATCH: " + $_.Exception.Message)
    exit 1
  }
}
try {
  $final = Invoke-RestMethod -Method GET -Uri $url -Headers $headers -ErrorAction Stop
} catch {
  Write-Output ("ERROR_GET_FINAL: " + $_.Exception.Message)
  exit 1
}
$finalDomains = @($final.authorizedDomains)
Write-Output "token_source=firebase-tools"
Write-Output ("initial_count=" + $domains.Count)
Write-Output ("domain_already_present=" + $had)
Write-Output ("final_count=" + $finalDomains.Count)
Write-Output ("domain_present_after=" + ($finalDomains -contains $domainToAdd))
Write-Output "final_domains:"
$finalDomains | ForEach-Object { Write-Output (" - " + $_) }
