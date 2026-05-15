#requires -Version 5.1
# kedaweb-compat: PostToolUse hook for kedaweb invariants + WRITING_GUIDE self-check
# Target: kedalab/{00..08}_*/**.md (public content)
# Spec: _workspace/conventions/Folder_Convention_20260515.md

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

try {
    $stdin = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($stdin)) { exit 0 }
    $hookData = $stdin | ConvertFrom-Json

    $file = $null
    if ($hookData.tool_input.file_path)     { $file = $hookData.tool_input.file_path }
    elseif ($hookData.tool_input.notebook_path) { $file = $hookData.tool_input.notebook_path }
    if (-not $file) { exit 0 }

    $file = $file -replace '/', '\'

    if ($file -notmatch '\\kedalab\\.+\.md$') { exit 0 }
    if ($file -match '\\kedalab\\(_[^\\]+|99_kedaweb)\\') { exit 0 }
    if ($file -match '\\kedalab\\[^\\]+\.md$') { exit 0 }

    if (-not (Test-Path -LiteralPath $file)) { exit 0 }

    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $issues = @()

    $kedalabRoot = 'C:\Users\fujiz\マイドライブ\kedalab'
    $relPath = $file -replace [regex]::Escape($kedalabRoot + '\'), ''
    $relPathFwd = $relPath -replace '\\', '/'

    # I3: relation section header
    $relSectionHeader = [char]0x95A2 + [char]0x9023 + [char]0x6280 + [char]0x8853
    if ($content -notmatch ('(?m)^(##|###)\s*' + $relSectionHeader + '\s*$')) {
        $issues += "[I3] Missing '## or ### " + $relSectionHeader + "' section (kedaweb Navigator edge source)"
    }

    # I4: prev/next/related labels (full-width and half-width colons both accepted)
    $labelPrev    = [char]0x524D  # 前
    $labelNext    = [char]0x5F8C  # 後
    $labelRelated = [char]0x95A2 + [char]0x9023  # 関連
    $labelPattern = '(' + $labelPrev + '|' + $labelNext + '|' + $labelRelated + ')[:' + [char]0xFF1A + ']'
    if ($content -notmatch $labelPattern) {
        $issues += "[I4] Missing prev/next/related labels in relation section"
    }

    # I5: backtick-quoted relative paths inside relation section
    $relSectionRegex = '(?ms)^(##|###)\s*' + $relSectionHeader + '\s*$\r?\n(.+?)(?=^(##|###)\s|\z)'
    $relMatch = [regex]::Match($content, $relSectionRegex)
    if ($relMatch.Success) {
        $section = $relMatch.Groups[2].Value
        if ($section -notmatch '`[^`]+\.md`') {
            $issues += "[I5] No backtick-quoted relative path (e.g. backtick path.md backtick) found in relation section"
        }
    }

    # I2: registered in TECHNIQUES_INDEX*.md (or README.md for Playbook)
    $fileName = Split-Path -Leaf $file
    $indices = @(
        (Join-Path $kedalabRoot 'TECHNIQUES_INDEX.md'),
        (Join-Path $kedalabRoot 'TECHNIQUES_INDEX_AI_ML.md')
    )
    $indexed = $false
    foreach ($idx in $indices) {
        if (Test-Path -LiteralPath $idx) {
            $idxContent = [System.IO.File]::ReadAllText($idx, [System.Text.Encoding]::UTF8)
            if ($idxContent.Contains($fileName)) { $indexed = $true; break }
        }
    }
    if (-not $indexed -and $relPathFwd.StartsWith('00_Playbook/')) {
        $readme = Join-Path $kedalabRoot 'README.md'
        if (Test-Path -LiteralPath $readme) {
            $readmeContent = [System.IO.File]::ReadAllText($readme, [System.Text.Encoding]::UTF8)
            if ($readmeContent.Contains($fileName)) { $indexed = $true }
        }
    }
    if (-not $indexed) {
        $issues += "[I2] $fileName not registered in TECHNIQUES_INDEX*.md (or README.md for Playbook)"
    }

    # WRITING_GUIDE self-check patterns
    $wgPatterns = @(
        @{ Pattern = 'HTB|HackTheBox|Hack The Box|TryHackMe|OSCP|VulnHub'; Label = 'WG: training-platform name' },
        @{ Pattern = 'user\.txt|root\.txt|flag\.txt';                       Label = 'WG: CTF flag filename' },
        @{ Pattern = '10\.10\.\d+\.\d+';                                    Label = 'WG: HTB-style IP (10.10.x.x)' },
        @{ Pattern = 'corp\.local';                                         Label = 'WG: corp.local domain' },
        @{ Pattern = 'Password123!|P@ssw0rd1234!';                          Label = 'WG: training weak password' },
        @{ Pattern = '<[a-z][a-z _-]+>';                                    Label = 'WG: lowercase placeholder (use [UPPER_SNAKE_CASE])' }
    )

    foreach ($pat in $wgPatterns) {
        $m = [regex]::Match($content, $pat.Pattern)
        if ($m.Success) {
            $issues += "$($pat.Label) - hit: '$($m.Value)'"
        }
    }

    if ($issues.Count -gt 0) {
        $lines = @("kedaweb / WRITING_GUIDE compatibility violation [$relPathFwd]:")
        foreach ($i in $issues) { $lines += "  - $i" }
        $lines += "Spec: _workspace/conventions/Folder_Convention_20260515.md"
        $msg = $lines -join "`n"

        $output = @{
            hookSpecificOutput = @{
                hookEventName     = 'PostToolUse'
                additionalContext = $msg
            }
        }
        $output | ConvertTo-Json -Compress -Depth 5 | Write-Output
    }

    exit 0
}
catch {
    exit 0
}
