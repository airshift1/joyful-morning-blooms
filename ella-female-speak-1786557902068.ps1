Add-Type -AssemblyName System.Speech
$bytes = [System.Convert]::FromBase64String('SGkgdGhlcmUhIEknbSBFbGxhLCBhbmQgSSdtIGhlcmUgdG8gaGVscCBhbnN3ZXIgYW55IHF1ZXN0aW9ucyB5b3UgbWlnaHQgaGF2ZS4gUGxlYXNlIGdvIGFoZWFkIGFuZCBhc2sgeW91ciBxdWVzdGlvbiwgYW5kIEknbGwgZG8gbXkgYmVzdCB0byBwcm92aWRlIGEgaGVscGZ1bCByZXNwb25zZS4=')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = 0
$synth.Volume = 100
$synth.Speak($text)
$synth.Dispose()