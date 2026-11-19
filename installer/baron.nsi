; Baron NSIS Windows Installer Script
Unicode True

!include "MUI2.nsh"
!include "LogicLib.nsh"

!ifndef VERSION
  !define VERSION "0.2.0-dev"
!endif

!ifndef OUTFILE
  !define OUTFILE "Baron-Setup-${VERSION}-x86_64.exe"
!endif

!define APP_NAME "Baron"
!define EXE_NAME "Baron.exe"
!define APP_IDENTIFIER "com.baron.companion"
!define UNINSTALL_REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Baron"

Name "${APP_NAME}"
Caption "${APP_NAME} ${VERSION} Setup"
BrandingText "${APP_NAME}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\${APP_NAME}"
InstallDirRegKey HKCU "${UNINSTALL_REG_KEY}" "InstallLocation"
RequestExecutionLevel user

!define MUI_ICON "..\assets\logo\baron.ico"
!define MUI_UNICON "..\assets\logo\baron.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE_NAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch ${APP_NAME}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; Strip leading and trailing double quotes from a path string on the stack
Function StripQuotes
  Exch $R0
  Push $R1
  Push $R2

  StrCpy $R1 $R0 1
  ${If} $R1 == '"'
    StrCpy $R0 $R0 "" 1
  ${EndIf}

  StrLen $R2 $R0
  ${If} $R2 > 0
    IntOp $R2 $R2 - 1
    StrCpy $R1 $R0 1 $R2
    ${If} $R1 == '"'
      StrCpy $R0 $R0 $R2
    ${EndIf}
  ${EndIf}

  Pop $R2
  Pop $R1
  Exch $R0
FunctionEnd

; Detect any previous Baron installation, uninstall it cleanly, and clear old app/WebView2 data
Function UninstallPreviousIfPresent
  Push $R0
  Push $R1
  Push $R2

  ; Close any running Baron instance before inspecting or removing files
  ExecWait 'cmd /c taskkill /F /IM "${EXE_NAME}" /IM "baron-app.exe" >nul 2>&1'
  Sleep 450

  StrCpy $R2 "0"
  ReadRegStr $R0 HKCU "${UNINSTALL_REG_KEY}" "UninstallString"
  ReadRegStr $R1 HKCU "${UNINSTALL_REG_KEY}" "InstallLocation"

  ${If} $R0 != ""
    Push $R0
    Call StripQuotes
    Pop $R0
    StrCpy $R2 "1"
  ${EndIf}

  ${If} $R1 == ""
    ${If} ${FileExists} "$INSTDIR\Uninstall.exe"
      StrCpy $R0 "$INSTDIR\Uninstall.exe"
      StrCpy $R1 "$INSTDIR"
      StrCpy $R2 "1"
    ${ElseIf} ${FileExists} "$INSTDIR\${EXE_NAME}"
      StrCpy $R1 "$INSTDIR"
      StrCpy $R2 "1"
    ${EndIf}
  ${Else}
    StrCpy $R2 "1"
  ${EndIf}

  ${If} $R2 == "1"
    DetailPrint "Previous ${APP_NAME} installation detected. Uninstalling old version and clearing data..."

    ${If} $R0 != ""
    ${AndIf} ${FileExists} "$R0"
      ${If} $R1 != ""
        ; _?= makes the NSIS uninstaller execute synchronously without self-copying to TEMP
        ExecWait '"$R0" /S _?=$R1'
      ${Else}
        ExecWait '"$R0" /S _?=$INSTDIR'
      ${EndIf}
      Delete "$R0"
      Sleep 300
    ${EndIf}

    ; Ensure old installation folder artifacts and shortcuts are removed
    ${If} $R1 != ""
      Delete "$R1\${EXE_NAME}"
      Delete "$R1\baron-app.exe"
      Delete "$R1\baron.ico"
      Delete "$R1\README.md"
      Delete "$R1\LICENSE"
      Delete "$R1\Uninstall.exe"
      ${If} $R1 != $INSTDIR
        RMDir "$R1"
      ${EndIf}
    ${EndIf}

    Delete "$DESKTOP\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk"
    RMDir "$SMPROGRAMS\${APP_NAME}"

    ; Purge old Tauri WebView2 cache and local/roaming Baron application data
    RMDir /r "$LOCALAPPDATA\${APP_IDENTIFIER}"
    RMDir /r "$APPDATA\${APP_IDENTIFIER}"
    RMDir /r "$LOCALAPPDATA\${APP_NAME}"
    RMDir /r "$APPDATA\${APP_NAME}"

    DeleteRegKey HKCU "${UNINSTALL_REG_KEY}"
    System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
    DetailPrint "Previous ${APP_NAME} installation and cached data removed."
  ${EndIf}

  Pop $R2
  Pop $R1
  Pop $R0
FunctionEnd

Section "${APP_NAME}" SecMain
  ; Detect and cleanly remove any previous Baron version & cached data first
  Call UninstallPreviousIfPresent

  SetOutPath "$INSTDIR"
  File "..\dist\${EXE_NAME}"
  File "..\assets\logo\baron.ico"
  File "..\dist\README.md"
  File "..\dist\LICENSE"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Delete existing shortcuts before recreating them so Explorer drops stale icon entries
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk"
  Delete "$DESKTOP\${APP_NAME}.lnk"

  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${EXE_NAME}" "" "$INSTDIR\baron.ico" 0
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\baron.ico" 0
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${EXE_NAME}" "" "$INSTDIR\baron.ico" 0

  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "Publisher" "Baron Contributors"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "DisplayIcon" "$INSTDIR\baron.ico"
  WriteRegStr HKCU "${UNINSTALL_REG_KEY}" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
  WriteRegDWORD HKCU "${UNINSTALL_REG_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_REG_KEY}" "NoRepair" 1

  ; Notify Windows Explorer to invalidate cached icons (SHCNE_ASSOCCHANGED)
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
SectionEnd

Section "Uninstall"
  ExecWait 'cmd /c taskkill /F /IM "${EXE_NAME}" /IM "baron-app.exe" >nul 2>&1'
  Sleep 450

  Delete "$DESKTOP\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"

  Delete "$INSTDIR\${EXE_NAME}"
  Delete "$INSTDIR\baron-app.exe"
  Delete "$INSTDIR\baron.ico"
  Delete "$INSTDIR\README.md"
  Delete "$INSTDIR\LICENSE"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  ; Remove local/roaming Baron application data and WebView2 cache
  RMDir /r "$LOCALAPPDATA\${APP_IDENTIFIER}"
  RMDir /r "$APPDATA\${APP_IDENTIFIER}"
  RMDir /r "$LOCALAPPDATA\${APP_NAME}"
  RMDir /r "$APPDATA\${APP_NAME}"

  DeleteRegKey HKCU "${UNINSTALL_REG_KEY}"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
SectionEnd
