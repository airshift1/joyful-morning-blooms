Add-Type -AssemblyName System.Speech
$bytes = [System.Convert]::FromBase64String('SGkgdGhlcmUhICpnaWdnbGUqIEknbSBFbGxhLCBhbmQgSSdtIGhlcmUgdG8gaGVscCB5b3Ugd2l0aCB5b3VyIHF1ZXN0aW9ucy4gV2hhdCdzIHVwPyAqZ3Jpbio=')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = 0
$synth.Volume = 100
$synth.Speak($text)
$synth.Dispose()