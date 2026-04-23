$path = "src\components\studio\creative-studio.tsx"
$content = Get-Content $path -Encoding UTF8
$lineIndex = 2047 # Target line

$newBlock = @"
    if (!effectRafRef.current) {
      effectRafRef.current = requestAnimationFrame(() => {
        targets.forEach(obj => {
          reapplyAllEffects(obj)
          obj.set('dirty', true)
        })
        canvas.requestRenderAll()

        // Optimization: Shallow clone instead of heavy deep JSON serialize
        const first = targets[0] as any
        const latestProps = first?.fxProps ? { ...first.fxProps } : {}
        
        setSel(prev => ({ ...prev, fxProps: latestProps }))
        effectRafRef.current = null
      })
    }
"@

$newContent = @()
for ($i = 0; $i -lt $content.Length; $i++) {
    if ($i -eq $lineIndex - 1) {
        $newContent += $newBlock
        # Skip the original block (lines 2047-2057)
        # Wait, the lines might have shifted slightly if I'm not careful.
        # I'll just replace the original lines by skipping them.
        $i += 10 # skips 11 lines total
        continue
    }
    $newContent += $content[$i]
}

Set-Content $path $newContent -Encoding UTF8
