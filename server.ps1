# server.ps1 - Un servidor web estático nativo y ligero en PowerShell.
# No requiere Node.js, Python, ni dependencias externas.

$port = 8080
$localDir = "D:\guitar-practice-app"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "============================================="
    Write-Host " Guitar Studio - Servidor Local Iniciado"
    Write-Host " Abre tu navegador en: http://localhost:$port/"
    Write-Host "============================================="
    Write-Host "Presiona Ctrl+C en la terminal para detener."

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            # Log incoming request
            Write-Host "Incoming Request: $($request.HttpMethod) $($request.Url.PathAndQuery)"
            
            $rawPath = $request.Url.LocalPath
            if ($rawPath -eq "/log") {
                $err = $request.QueryString["err"]
                if ($err) {
                    Write-Host "CLIENT LOG/ERROR: $err" -ForegroundColor Red
                }
                $response.StatusCode = 200
                $response.ContentType = "text/plain"
                $okBytes = [System.Text.Encoding]::UTF8.GetBytes("OK")
                $response.OutputStream.Write($okBytes, 0, $okBytes.Length)
                $response.Close()
                continue
            }
            
            if ($rawPath -eq "/" -or $rawPath -eq "") {
                $rawPath = "/index.html"
            }
            
            # Reemplazar barras inclinadas y limpiar ruta
            $cleanPath = $rawPath.Replace("/", "\").TrimStart("\")
            $filePath = Join-Path $localDir $cleanPath
            
            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                
                # Asignar Content-Type adecuado para evitar advertencias en el navegador
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                switch ($ext) {
                    ".html" { $contentType = "text/html; charset=utf-8" }
                    ".css"  { $contentType = "text/css; charset=utf-8" }
                    ".js"   { $contentType = "application/javascript; charset=utf-8" }
                    ".wav"  { $contentType = "audio/wav" }
                    ".mp3"  { $contentType = "audio/mpeg" }
                    ".gp"   { $contentType = "application/octet-stream" }
                    ".gp5"  { $contentType = "application/octet-stream" }
                    default { $contentType = "text/plain" }
                }
                
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                
                # Habilitar CORS simple si hiciera falta
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                # Recurso no encontrado (404)
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - Archivo no encontrado")
                $response.ContentType = "text/plain; charset=utf-8"
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            
            $response.Close()
        }
        catch {
            Write-Host "Error al procesar peticion: $_"
            if ($null -ne $response) {
                try { $response.Close() } catch {}
            }
        }
    }
}
catch {
    Write-Host "Error en el servidor: $_"
}
finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
