Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Ella — Voice Selector'
$form.Size = New-Object System.Drawing.Size(420,220)
$form.StartPosition = 'CenterScreen'

$label = New-Object System.Windows.Forms.Label
$label.Text = 'Select a Windows SAPI voice to use for Ella:'
$label.AutoSize = $true
$label.Location = New-Object System.Drawing.Point(10,10)
$form.Controls.Add($label)

$combo = New-Object System.Windows.Forms.ComboBox
$combo.Location = New-Object System.Drawing.Point(10,40)
$combo.Size = New-Object System.Drawing.Size(380,24)
$combo.DropDownStyle = 'DropDownList'
$form.Controls.Add($combo)

$ok = New-Object System.Windows.Forms.Button
$ok.Text = 'Save and Apply'
$ok.Location = New-Object System.Drawing.Point(200,110)
$ok.Size = New-Object System.Drawing.Size(100,30)
$form.Controls.Add($ok)

$cancel = New-Object System.Windows.Forms.Button
$cancel.Text = 'Cancel'
$cancel.Location = New-Object System.Drawing.Point(310,110)
$cancel.Size = New-Object System.Drawing.Size(80,30)
$form.Controls.Add($cancel)

$status = New-Object System.Windows.Forms.Label
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(10,150)
$form.Controls.Add($status)

# get voices
try {
    Add-Type -AssemblyName System.Speech
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
} catch {
    [System.Windows.Forms.MessageBox]::Show("Could not enumerate SAPI voices: $_", 'Error', 'OK', 'Error')
    exit 1
}

foreach ($v in $voices) { $combo.Items.Add($v) | Out-Null }
if ($voices.Count -gt 0) { $combo.SelectedIndex = 0 }

$cancel.Add_Click({ $form.Close() })

$ok.Add_Click({
    $voice = $combo.SelectedItem
    if (-not $voice) { $status.Text = 'No voice selected'; return }
    # write to .env in repo root
    $repo = Join-Path $env:USERPROFILE '.copilot\repos\copilot-worktrees\joyful-morning-blooms\airshift1-friendly-enigma'
    $envPath = Join-Path $repo '.env'
    try {
        if (-not (Test-Path $envPath)) { New-Item -Path $envPath -ItemType File -Force | Out-Null }
        $content = Get-Content -Path $envPath -Raw -ErrorAction SilentlyContinue
        if (-not $content) { $content = "" }
        $lines = $content -split "\r?\n"
        $found = $false
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^\s*SAPI_VOICE\s*=') {
            $lines[$i] = 'SAPI_VOICE="' + $voice + '"'
                $found = $true; break
            }
        }
        if (-not $found) { $lines += 'SAPI_VOICE="' + $voice + '"' }
        $out = $lines -join "`n"
        Set-Content -Path $envPath -Value $out -Encoding UTF8
        # also set for current session
        [System.Environment]::SetEnvironmentVariable('SAPI_VOICE', $voice, 'Process')
        $status.Text = "Saved: $voice"
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Failed to save .env: $_", 'Error', 'OK', 'Error')
    }
})

$form.Topmost = $true
[void]$form.ShowDialog()