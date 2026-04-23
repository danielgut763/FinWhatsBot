Dim shell
Set shell = CreateObject("WScript.Shell")
pasta = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

shell.Run "cmd /c cd /d """ & pasta & """ && :loop & python server.py & timeout /t 5 /nobreak >nul & goto loop", 0, False
WScript.Sleep 3000
shell.Run "cmd /c cd /d """ & pasta & """ && :loop & python fintrack_bot.py & timeout /t 5 /nobreak >nul & goto loop", 0, False