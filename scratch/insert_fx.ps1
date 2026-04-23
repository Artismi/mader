$path = "src\components\studio\creative-studio.tsx"
$content = Get-Content $path -Encoding UTF8
$lineIndex = 4612 # After the PropertiesPanel closing tag

$newBlock = @"

        {showFX && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer" onClick={() => setShowFX(false)} />
            <div className="relative z-10 animate-in zoom-in-95 duration-200">
              <UnifiedFXPanel 
                sel={sel} 
                onUpdate={updateEffectProp} 
                onClose={() => setShowFX(false)} 
              />
            </div>
          </div>
        )}
"@

$newContent = @()
for ($i = 0; $i -lt $content.Length; $i++) {
    $newContent += $content[$i]
    if ($i -eq $lineIndex - 1) {
        $newContent += $newBlock
    }
}

Set-Content $path $newContent -Encoding UTF8
