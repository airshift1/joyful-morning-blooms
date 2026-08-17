Add-Type -AssemblyName System.Speech
$bytes = [System.Convert]::FromBase64String('SGV5IHRoZXJlISBIb3cgY2FuIEkgaGVscCB5b3UgdG9kYXk/IPCfmIo=')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = 0
$synth.Volume = 100
$synth.Speak($text)
$synth.Dispose()