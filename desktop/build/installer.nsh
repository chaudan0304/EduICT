; Refuse an upgrade before uninstalling anything if the existing installation
; cannot be modified. The stock NSIS uninstall retry otherwise reaches a modal
; error even in /S mode and appears to hang in background installations.
!macro customInit
  Push $R0
  Push $R1
  Push $R2
  ${If} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    ClearErrors
    ; GetTempFileName can fall back to Windows TEMP, so explicitly open a
    ; uniquely named probe inside INSTDIR instead of trusting that command.
    GetTempFileName $R0
    Delete "$R0"
    ${GetFileName} "$R0" $R0
    StrCpy $R0 "$INSTDIR\.EduMaster-write-probe-$R0"
    ClearErrors
    StrCpy $R2 "0"
    FileOpen $R1 "$R0" w
    ; IfErrors consumes the flag: record the outcome before checking again.
    ${If} ${Errors}
      StrCpy $R2 "1"
    ${Else}
      FileClose $R1
      Delete "$R0"
      ${If} ${Errors}
        StrCpy $R2 "1"
      ${EndIf}
    ${EndIf}
    ${If} $R2 == "1"
      CreateDirectory "$LOCALAPPDATA\EduMaster"
      FileOpen $R1 "$LOCALAPPDATA\EduMaster\installer.log" w
      FileWrite $R1 "INSTALL_LOCATION_NOT_WRITABLE: restart installer with administrator privileges.$\r$\n"
      FileClose $R1
      ${IfNot} ${Silent}
        MessageBox MB_OK|MB_ICONEXCLAMATION "Không thể cập nhật EduMaster vì thư mục cài đặt không cho phép ghi. Hãy chạy bộ cài bằng Run as administrator (Chạy với quyền quản trị). Dữ liệu giảng dạy được giữ nguyên."
      ${EndIf}
      SetErrorLevel 5
      Quit
    ${EndIf}
  ${EndIf}
  Pop $R2
  Pop $R1
  Pop $R0
!macroend
