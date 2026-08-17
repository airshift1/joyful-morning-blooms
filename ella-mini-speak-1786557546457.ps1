Add-Type -AssemblyName System.Speech
$bytes = [System.Convert]::FromBase64String('U29ycnksIEkgY291bGRuJ3QgZ2VuZXJhdGUgYSByZXNwb25zZS4=')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.Rate = 0
$voice.Volume = 100
$voice.Speak($text)
$voice.Dispose()