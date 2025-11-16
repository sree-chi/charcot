# PowerShell script to download face-api.js models for emotion detection
# Run this script to enable offline emotion detection with better performance

Write-Host "Downloading face-api.js models..." -ForegroundColor Green

# Create models directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "public\models" | Out-Null

# Model URLs
$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$models = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_expression_model-weights_manifest.json",
    "face_expression_model-shard1"
)

# Download each model file
foreach ($model in $models) {
    $url = "$baseUrl/$model"
    $output = "public\models\$model"

    Write-Host "Downloading $model..." -ForegroundColor Cyan

    try {
        Invoke-WebRequest -Uri $url -OutFile $output
        Write-Host "  ✓ Downloaded $model" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to download $model" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Model download complete!" -ForegroundColor Green
Write-Host "Models saved to public\models\" -ForegroundColor Yellow
Write-Host ""
Write-Host "The app will now use local models for faster emotion detection." -ForegroundColor Cyan
