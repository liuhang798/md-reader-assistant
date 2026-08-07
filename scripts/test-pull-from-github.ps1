$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceBat = Join-Path $projectRoot 'pull-from-github.bat'

if (-not (Test-Path -LiteralPath $sourceBat)) {
    throw 'pull-from-github.bat does not exist.'
}

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Invoke-PullScenario {
    param([bool]$Dirty)

    $sandbox = Join-Path ([System.IO.Path]::GetTempPath()) ("md-reader-pull-test-" + [Guid]::NewGuid().ToString('N'))
    $bin = Join-Path $sandbox 'bin'
    $log = Join-Path $sandbox 'git.log'

    New-Item -ItemType Directory -Path $bin -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $sandbox '.git') -Force | Out-Null
    Copy-Item -LiteralPath $sourceBat -Destination (Join-Path $sandbox 'pull-from-github.bat')

    $typeName = 'FakeGit' + [Guid]::NewGuid().ToString('N')
    $fakeGitSource = @"
using System;
using System.IO;

public static class $typeName
{
    public static int Main(string[] args)
    {
        string log = Environment.GetEnvironmentVariable("FAKE_GIT_LOG");
        File.AppendAllText(log, string.Join(" ", args) + Environment.NewLine);

        if (args.Length > 0 && args[0] == "status" &&
            Environment.GetEnvironmentVariable("FAKE_GIT_DIRTY") == "1")
        {
            Console.WriteLine("?? local-change.txt");
        }

        if (args.Length > 0 && args[0] == "log")
        {
            Console.WriteLine("abc123 Test commit");
        }

        return 0;
    }
}
"@
    Add-Type -TypeDefinition $fakeGitSource -OutputAssembly (Join-Path $bin 'git.exe') -OutputType ConsoleApplication

    $oldPath = $env:PATH
    $oldLog = $env:FAKE_GIT_LOG
    $oldDirty = $env:FAKE_GIT_DIRTY
    $oldTest = $env:PULL_SCRIPT_TEST

    try {
        $env:PATH = "$bin;$oldPath"
        $env:FAKE_GIT_LOG = $log
        $env:FAKE_GIT_DIRTY = if ($Dirty) { '1' } else { '0' }
        $env:PULL_SCRIPT_TEST = '1'

        & cmd.exe /d /c "call `"$sandbox\pull-from-github.bat`"" | Out-Null
        $exitCode = $LASTEXITCODE
        $commands = if (Test-Path -LiteralPath $log) { Get-Content -Raw -LiteralPath $log } else { '' }

        return [pscustomobject]@{
            ExitCode = $exitCode
            Commands = $commands
        }
    }
    finally {
        $env:PATH = $oldPath
        $env:FAKE_GIT_LOG = $oldLog
        $env:FAKE_GIT_DIRTY = $oldDirty
        $env:PULL_SCRIPT_TEST = $oldTest
        Remove-Item -LiteralPath $sandbox -Recurse -Force
    }
}

$scriptText = Get-Content -Raw -LiteralPath $sourceBat
Assert-True ($scriptText -notmatch '(?i)reset\s+--hard') 'The script must not use git reset --hard.'
Assert-True ($scriptText -notmatch '(?i)git\s+clean') 'The script must not use git clean.'
Assert-True ($scriptText -notmatch '(?i)git\s+rebase') 'The script must not use git rebase.'

$clean = Invoke-PullScenario -Dirty $false
Assert-True ($clean.ExitCode -eq 0) "Clean update should succeed, got exit code $($clean.ExitCode)."
Assert-True ($clean.Commands -match '(?im)\bfetch\b.*\borigin\s+main\b') "Clean update did not fetch origin/main. Commands:`n$($clean.Commands)"
Assert-True ($clean.Commands -match '(?im)^merge --ff-only origin/main\s*$') 'Clean update did not use a fast-forward-only merge.'

$dirty = Invoke-PullScenario -Dirty $true
Assert-True ($dirty.ExitCode -ne 0) 'Dirty worktree should be rejected.'
Assert-True ($dirty.Commands -notmatch '(?im)\bfetch\b') 'Dirty worktree must be rejected before fetching.'
Assert-True ($dirty.Commands -notmatch '(?im)^merge\b') 'Dirty worktree must be rejected before merging.'

Write-Host 'PASS: pull-from-github.bat clean and dirty scenarios behave safely.'
