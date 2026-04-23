$path = "src\components\studio\creative-studio.tsx"
$content = Get-Content $path -Encoding UTF8
$lineIndex = 5173 # The start of the scrollable content area

$newBlock = @"
          {availSubTabs.length > 1 && (
            <div className="flex-shrink-0 flex items-center gap-1 p-1 px-3 bg-white/[0.02] border-b border-white/[0.04]">
              {availSubTabs.map(t => (
                <button key={t.id} onClick={() => setPropTab(t.id)} title={t.label}
                  className={cn('flex-1 h-8 flex flex-col items-center justify-center rounded-lg transition-all',
                    propTab === t.id ? 'bg-accent/10 text-accent shadow-inner' : 'text-white/20 hover:text-white/40')}>
                  {t.icon}
                </button>
              ))}
            </div>
          )}
"@

$newContent = @()
for ($i = 0; $i -lt $content.Length; $i++) {
    if ($i -eq $lineIndex - 1) {
        $newContent += $newBlock
    }
    $newContent += $content[$i]
}

Set-Content $path $newContent -Encoding UTF8
