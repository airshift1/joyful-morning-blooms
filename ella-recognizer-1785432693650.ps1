Add-Type -AssemblyName System.Speech
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$rec.SetInputToDefaultAudioDevice()
$rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
while ($true) {
  $r = $rec.Recognize()
  if ($r -and $r.Text) { Write-Output $r.Text }
}