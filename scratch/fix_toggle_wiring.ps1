$path = "src\components\studio\creative-studio.tsx"
$content = Get-Content $path -Raw -Encoding UTF8

# 1. Update PanelProps Interface (fix types)
$interfaceOld = "bgRemoving: boolean\s+}"
$interfaceNew = "bgRemoving: boolean`n    showFX: boolean`n    setShowFX: (v: boolean) => void`n    showFP: boolean`n    setShowFP: (v: boolean) => void`n    showImgFx: boolean`n    setShowImgFx: (v: boolean) => void`n  }"
$content = $content -replace $interfaceOld, $interfaceNew

# 2. Update PropertiesPanel call (pass props)
$renderOld = "bgRemoving={bgRemoving}\s+/>"
$renderNew = "bgRemoving={bgRemoving}`n            showFX={showFX}`n            setShowFX={setShowFX}`n            showFP={showFP}`n            setShowFP={setShowFP}`n            showImgFx={showImgFx}`n            setShowImgFx={setShowImgFx}`n          />"
$content = $content -replace $renderOld, $renderNew

Set-Content $path $content -Encoding UTF8
