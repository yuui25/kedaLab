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
    if ($file -match '\\kedalab\\(_[^\\]+|99_kedaweb|\.claude|\.git)\\') { exit 0 }
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

    # I4: prev/next/related labels (full-width and half-width colons both accepted).
    # 06_Concepts/ files are exempt — concept files have no procedural before/after flow,
    # so `関連：` only is acceptable (per WRITING_GUIDE「06_Concepts/ ファイルの書き方」).
    $labelPrev    = [char]0x524D  # 前
    $labelNext    = [char]0x5F8C  # 後
    $labelRelated = [char]0x95A2 + [char]0x9023  # 関連
    $labelPattern = '(' + $labelPrev + '|' + $labelNext + '|' + $labelRelated + ')[:' + [char]0xFF1A + ']'
    $isConceptFile = $relPathFwd.StartsWith('06_Concepts/')
    if (-not $isConceptFile -and $content -notmatch $labelPattern) {
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
    # WG-PLATFORM is checked line-by-line so we can skip the sanctioned template
    # boilerplate (HIGH IMPACT warning / 演習環境での扱い row). Other patterns are
    # full-content checks since they should never appear anywhere in public files.
    $wgPatterns = @(
        @{ Pattern = 'user\.txt|root\.txt|flag\.txt';                       Label = 'WG: CTF flag filename' },
        @{ Pattern = '10\.10\.\d+\.\d+';                                    Label = 'WG: HTB-style IP (10.10.x.x)' },
        @{ Pattern = 'corp\.local';                                         Label = 'WG: corp.local domain' },
        @{ Pattern = 'Password123!|P@ssw0rd1234!';                          Label = 'WG: training weak password' },
        # Placeholder regex requires a separator (_ - or space) inside so that
        # standalone HTML/XML tags like <script>/<html>/<title> don't false-positive.
        @{ Pattern = '<[a-z]+[ _-][a-z _-]*>';                              Label = 'WG: lowercase placeholder (use [UPPER_SNAKE_CASE])' }
    )

    foreach ($pat in $wgPatterns) {
        $m = [regex]::Match($content, $pat.Pattern)
        if ($m.Success) {
            $issues += "$($pat.Label) - hit: '$($m.Value)'"
        }
    }

    # WG-PLATFORM: skip lines in template context (HIGH IMPACT / 演習環境での扱い row /
    # `HTB / OSCP` boilerplate phrase that the WRITING_GUIDE template explicitly sanctions).
    $platRe = 'HTB|HackTheBox|Hack The Box|TryHackMe|OSCP|VulnHub'
    foreach ($ln in $content -split "`n") {
        if ($ln -match $platRe) {
            if ($ln -match '演習環境|演習環境での扱い|HIGH IMPACT|HTB\s*/\s*OSCP') { continue }
            $mp = [regex]::Match($ln, $platRe)
            $issues += "WG: training-platform name - hit: '$($mp.Value)'"
            break
        }
    }

    # F1/F3: path-form checks inside 関連技術 section
    #   F1: ban root-relative `01_Foo/X.md` (use ../Folder/X.md or bare sibling)
    #   F3: ban directory-only path `Folder/` (link non-existent — kedaweb only resolves .md)
    $relHeaderRe = '(?m)^#{2,6}\s*' + $relSectionHeader + '\s*$'
    $f1Found = $false; $f3Found = $false
    foreach ($mh in [regex]::Matches($content, $relHeaderRe)) {
        $bodyStart = $mh.Index + $mh.Length
        $tail = $content.Substring($bodyStart)
        $level = ($mh.Value -split '\s')[0].Length
        $endRe = '(?m)^#{1,' + $level + '}\s+'
        $em = [regex]::Match($tail, $endRe)
        $section = if ($em.Success) { $tail.Substring(0, $em.Index) } else { $tail }
        if (-not $f1Found) {
            $rm = [regex]::Match($section, '`(0[0-8]_[A-Za-z_]+/[^`]+\.md)`')
            if ($rm.Success) {
                $issues += "[F1] Root-relative path in 関連技術: '$($rm.Groups[1].Value)' (use ../Folder/X.md or bare sibling)"
                $f1Found = $true
            }
        }
        if (-not $f3Found) {
            # backtick-quoted nav directory ending in `/`. Excludes:
            #  - `.git/` etc. (artifact mentions in prose — start with .)
            #  - `getcap -r /` etc. (shell command snippets — contain spaces)
            # Only match path-like content: optional ./ or ../, then letter-led segments.
            # Each segment = word char then word chars (allows digit-prefixed like 02_Foo).
            # Disallows leading `.` so `.git/` (prose) is excluded.
            $dm = [regex]::Match($section, '`((?:\.\.?/)?\w[\w]*(?:/\w[\w]*)*/)`')
            if ($dm.Success) {
                $issues += "[F3] Directory reference in 関連技術: '$($dm.Groups[1].Value)' (use a concrete *.md target)"
                $f3Found = $true
            }
        }
        if ($f1Found -and $f3Found) { break }
    }

    # F2: bold label immediately followed by list/table without blank line
    $f2Re = '(?m)\*\*[^\n*]+[:' + [char]0xFF1A + ']\*\*\r?\n[-*|]'
    $mF2 = [regex]::Match($content, $f2Re)
    if ($mF2.Success) {
        $snippet = $mF2.Value -replace "`r?`n", ' ⏎ '
        $issues += "[F2] Missing blank line after bold label before list/table: '$snippet'"
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
