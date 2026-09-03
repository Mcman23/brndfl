Set objShell = CreateObject("WScript.Shell")
strCommand = "cmd /c cd /d """ & CreateObject("WScript.Shell").CurrentDirectory & """ && npm run dev"
objShell.Run strCommand, 1, False
