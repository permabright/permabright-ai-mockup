$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 4174

function Load-DotEnv {
  $envPath = Join-Path $Root ".env"
  if (-not (Test-Path $envPath)) {
    return
  }

  foreach ($rawLine in Get-Content $envPath) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      continue
    }

    $parts = $line.Split("=", 2)
    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (-not [string]::IsNullOrWhiteSpace($name)) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

function Get-ContentType([string]$filePath) {
  switch ([IO.Path]::GetExtension($filePath).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".css" { return "text/css; charset=utf-8" }
    ".js" { return "application/javascript; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".webmanifest" { return "application/manifest+json; charset=utf-8" }
    ".png" { return "image/png" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".svg" { return "image/svg+xml" }
    ".ico" { return "image/x-icon" }
    default { return "application/octet-stream" }
  }
}

function Write-HttpResponse($stream, [int]$statusCode, [string]$contentType, [byte[]]$bodyBytes) {
  $statusText = switch ($statusCode) {
    200 { "OK" }
    400 { "Bad Request" }
    403 { "Forbidden" }
    404 { "Not Found" }
    405 { "Method Not Allowed" }
    default { "Internal Server Error" }
  }

  $header = @(
    "HTTP/1.1 $statusCode $statusText"
    "Content-Type: $contentType"
    "Content-Length: $($bodyBytes.Length)"
    "Connection: close"
    ""
    ""
  ) -join "`r`n"

  $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  $stream.Write($bodyBytes, 0, $bodyBytes.Length)
  $stream.Flush()
}

function Write-TextResponse($stream, [int]$statusCode, [string]$text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($text)
  Write-HttpResponse $stream $statusCode "text/plain; charset=utf-8" $bytes
}

function Write-JsonResponse($stream, [int]$statusCode, $payload) {
  $json = $payload | ConvertTo-Json -Depth 20 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  Write-HttpResponse $stream $statusCode "application/json; charset=utf-8" $bytes
}

function Read-HttpRequest($client) {
  $stream = $client.GetStream()
  $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::UTF8, $false, 4096, $true)

  $requestLine = $reader.ReadLine()
  if ([string]::IsNullOrWhiteSpace($requestLine)) {
    return $null
  }

  $parts = $requestLine.Split(" ")
  if ($parts.Length -lt 2) {
    throw "Malformed request line."
  }

  $headers = @{}
  while ($true) {
    $line = $reader.ReadLine()
    if ($line -eq $null -or $line -eq "") {
      break
    }

    $separator = $line.IndexOf(":")
    if ($separator -gt 0) {
      $name = $line.Substring(0, $separator).Trim().ToLowerInvariant()
      $value = $line.Substring($separator + 1).Trim()
      $headers[$name] = $value
    }
  }

  $body = ""
  if ($headers.ContainsKey("content-length")) {
    $length = [int]$headers["content-length"]
    if ($length -gt 0) {
      $buffer = New-Object char[] $length
      $offset = 0
      while ($offset -lt $length) {
        $read = $reader.Read($buffer, $offset, $length - $offset)
        if ($read -le 0) {
          break
        }
        $offset += $read
      }
      $body = New-Object string($buffer, 0, $offset)
    }
  }

  return @{
    Stream = $stream
    Method = $parts[0].ToUpperInvariant()
    Path = $parts[1]
    Headers = $headers
    Body = $body
  }
}

function Generate-Mockup($body) {
  $replicateToken = [Environment]::GetEnvironmentVariable("REPLICATE_API_TOKEN", "Process")
  if (-not [string]::IsNullOrWhiteSpace($replicateToken)) {
    return Generate-MockupWithReplicate $body $replicateToken
  }

  $apiKey = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Process")
  if ([string]::IsNullOrWhiteSpace($apiKey)) {
    throw "No provider token found. Add REPLICATE_API_TOKEN or OPENAI_API_KEY to webapp\.env."
  }

  return Generate-MockupWithOpenAI $body $apiKey
}

function Generate-MockupWithOpenAI($body, [string]$apiKey) {
  $inputs = @()
  if ($body.cleanPhotoDataUrl) {
    $inputs += @{ type = "input_image"; image_url = $body.cleanPhotoDataUrl }
  }
  if ($body.guidePhotoDataUrl) {
    $inputs += @{ type = "input_image"; image_url = $body.guidePhotoDataUrl }
  }

  if ($inputs.Count -eq 0) {
    throw "At least one image is required."
  }

  $content = @(@{ type = "input_text"; text = [string]$body.prompt }) + $inputs
  $payload = @{
    model = "gpt-4.1"
    input = @(
      @{
        role = "user"
        content = $content
      }
    )
    tools = @(
      @{
        type = "image_generation"
        size = "1536x1024"
        quality = "high"
      }
    )
    tool_choice = @{
      type = "image_generation"
    }
  }

  $headers = @{
    Authorization = "Bearer $apiKey"
    "Content-Type" = "application/json"
  }

  try {
    $result = Invoke-RestMethod `
      -Method Post `
      -Uri "https://api.openai.com/v1/responses" `
      -Headers $headers `
      -Body ($payload | ConvertTo-Json -Depth 20)
  } catch {
    $exception = $_.Exception
    $response = $exception.Response
    if ($response) {
      try {
        $stream = $response.GetResponseStream()
        $reader = New-Object IO.StreamReader($stream)
        $raw = $reader.ReadToEnd()
        $reader.Close()
        if ($raw) {
          try {
            $parsed = $raw | ConvertFrom-Json
            if ($parsed.error.message) {
              throw $parsed.error.message
            }
          } catch {
            throw $raw
          }
        }
      } catch {
        throw $_.Exception.Message
      }
    }
    throw $exception.Message
  }

  foreach ($item in $result.output) {
    if ($item.type -eq "image_generation_call" -and $item.result) {
      return @{
        imageDataUrl = "data:image/png;base64,$($item.result)"
      }
    }
  }

  throw "OpenAI returned no generated image."
}

function Generate-MockupWithReplicate($body, [string]$replicateToken) {
  $inputImages = @()
  if ($body.cleanPhotoDataUrl) {
    $inputImages += $body.cleanPhotoDataUrl
  }
  if ($body.guidePhotoDataUrl) {
    $inputImages += $body.guidePhotoDataUrl
  }

  if ($inputImages.Count -eq 0) {
    throw "At least one image is required."
  }

  $payload = @{
    input = @{
      prompt = [string]$body.prompt
      input_images = $inputImages
      aspect_ratio = "match_input_image"
      resolution = "match_input_image"
      safety_tolerance = 5
      output_format = "jpg"
      output_quality = 90
    }
  }

  $headers = @{
    Authorization = "Bearer $replicateToken"
    "Content-Type" = "application/json"
    Prefer = "wait=60"
  }

  $prediction = Invoke-ReplicateJson `
    -Method Post `
    -Uri "https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions" `
    -Headers $headers `
    -Body ($payload | ConvertTo-Json -Depth 20)

  if ($prediction.status -eq "starting" -or $prediction.status -eq "processing") {
    $prediction = Wait-ForReplicatePrediction $prediction.urls.get $replicateToken
  }

  if ($prediction.status -eq "failed") {
    if ($prediction.error) {
      throw [string]$prediction.error
    }
    throw "Replicate prediction failed."
  }

  if ($prediction.status -ne "succeeded" -or -not $prediction.output) {
    throw "Replicate did not return an image."
  }

  $imageUrl = if ($prediction.output -is [System.Array]) { $prediction.output[0] } else { [string]$prediction.output }
  if ([string]::IsNullOrWhiteSpace($imageUrl)) {
    throw "Replicate returned an empty image URL."
  }

  $client = New-Object Net.WebClient
  $client.Headers.Add("Authorization", "Bearer $replicateToken")
  try {
    $bytes = $client.DownloadData($imageUrl)
  } finally {
    $client.Dispose()
  }
  $base64 = [Convert]::ToBase64String($bytes)

  return @{
    imageDataUrl = "data:image/jpeg;base64,$base64"
  }
}

function Wait-ForReplicatePrediction([string]$getUrl, [string]$replicateToken) {
  $headers = @{ Authorization = "Bearer $replicateToken" }

  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 2
    $prediction = Invoke-ReplicateJson -Method Get -Uri $getUrl -Headers $headers
    if ($prediction.status -in @("succeeded", "failed", "canceled")) {
      return $prediction
    }
  }

  throw "Replicate timed out waiting for the mockup."
}

function Invoke-ReplicateJson {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers,
    [string]$Body = $null
  )

  try {
    if ($Body) {
      return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -Body $Body
    }
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
  } catch {
    $exception = $_.Exception
    $response = $exception.Response
    if ($response) {
      try {
        $stream = $response.GetResponseStream()
        $reader = New-Object IO.StreamReader($stream)
        $raw = $reader.ReadToEnd()
        $reader.Close()
        if ($raw) {
          try {
            $parsed = $raw | ConvertFrom-Json
            if ($parsed.detail) {
              throw $parsed.detail
            }
            if ($parsed.error) {
              throw $parsed.error
            }
          } catch {
            throw $raw
          }
        }
      } catch {
        throw $_.Exception.Message
      }
    }
    throw $exception.Message
  }
}

function Serve-StaticFile($request) {
  $requestPath = if ($request.Path -eq "/") { "/index.html" } else { $request.Path }
  $uri = [Uri]("http://localhost$requestPath")
  $relative = $uri.AbsolutePath.TrimStart("/") -replace "/", [IO.Path]::DirectorySeparatorChar
  $fullPath = [IO.Path]::GetFullPath((Join-Path $Root $relative))
  $rootFull = [IO.Path]::GetFullPath($Root)

  if (-not $fullPath.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
    Write-TextResponse $request.Stream 403 "Forbidden"
    return
  }

  if (-not (Test-Path $fullPath -PathType Leaf)) {
    Write-TextResponse $request.Stream 404 "Not found"
    return
  }

  $bytes = [IO.File]::ReadAllBytes($fullPath)
  Write-HttpResponse $request.Stream 200 (Get-ContentType $fullPath) $bytes
}

Load-DotEnv

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Any, $Port)
$listener.Start()

Write-Host "Permabright app running at http://localhost:$Port"
try {
  $localIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*"
    } |
    Select-Object -ExpandProperty IPAddress -Unique

  foreach ($ip in $localIps) {
    Write-Host "Local network URL: http://$ip`:$Port"
  }
} catch {
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()

    try {
      $request = Read-HttpRequest $client
      if (-not $request) {
        $client.Close()
        continue
      }

      if ($request.Method -eq "POST" -and $request.Path -eq "/api/mockup") {
        $body = if ($request.Body) { $request.Body | ConvertFrom-Json } else { @{} }
        $result = Generate-Mockup $body
        Write-JsonResponse $request.Stream 200 $result
      } elseif ($request.Method -eq "GET") {
        Serve-StaticFile $request
      } else {
        Write-TextResponse $request.Stream 405 "Method not allowed"
      }
    } catch {
      try {
        Write-JsonResponse $request.Stream 500 @{ error = $_.Exception.Message }
      } catch {
      }
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
