!ifndef BUILD_UNINSTALLER
; Refuse an upgrade before uninstalling anything if the existing installation
; cannot be modified. The stock NSIS uninstall retry otherwise reaches a modal
; error even in /S mode and appears to hang in background installations.
Var EduICTExistingMode

; Use the visible uninstall registration as the source of truth. An obsolete
; InstallLocation key can survive an older uninstall and select the wrong scope.
!macro customInstallMode
  ${If} $EduICTExistingMode == "CurrentUser"
    StrCpy $isForceCurrentInstall "1"
  ${ElseIf} $EduICTExistingMode == "all"
    StrCpy $isForceMachineInstall "1"
  ${EndIf}
!macroend

!macro customInit
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  Push $R4
  StrCpy $EduICTExistingMode ""
  ReadRegStr $R0 HKCU "${UNINSTALL_REGISTRY_KEY}" DisplayVersion
  ReadRegStr $R1 HKLM "${UNINSTALL_REGISTRY_KEY}" DisplayVersion
  ${If} $R0 != ""
  ${AndIf} $R1 == ""
    StrCpy $EduICTExistingMode "CurrentUser"
    StrCpy $hasPerMachineInstallation "0"
    StrCpy $hasPerUserInstallation "1"
    !insertmacro setInstallModePerUser
  ${ElseIf} $R0 == ""
  ${AndIf} $R1 != ""
    StrCpy $EduICTExistingMode "all"
    StrCpy $hasPerMachineInstallation "1"
    StrCpy $hasPerUserInstallation "0"
    !insertmacro setInstallModePerAllUsers
  ${ElseIf} $R0 != ""
  ${AndIf} $R1 != ""
    ReadRegStr $R3 HKCU "${UNINSTALL_REGISTRY_KEY}" DisplayIcon
    ReadRegStr $R4 HKLM "${UNINSTALL_REGISTRY_KEY}" DisplayIcon
    ${If} $R3 != ""
    ${AndIf} $R3 == $R4
      ${IfNot} ${Silent}
        MessageBox MB_OK|MB_ICONEXCLAMATION "Windows đang có hai mục EduMaster trỏ cùng thư mục. Hãy dọn mục đăng ký trùng trước khi cập nhật; không chạy gỡ một mục vì có thể xóa bản đang dùng."
      ${EndIf}
      SetErrorLevel 6
      Quit
    ${EndIf}
  ${EndIf}
  ${GetParameters} $R0
  ClearErrors
  ${If} $EduICTExistingMode == "CurrentUser"
    ${GetOptions} $R0 "/allusers" $R1
  ${ElseIf} $EduICTExistingMode == "all"
    ${GetOptions} $R0 "/currentuser" $R1
  ${Else}
    SetErrors
  ${EndIf}
  ${IfNot} ${Errors}
    ${IfNot} ${Silent}
      MessageBox MB_OK|MB_ICONEXCLAMATION "Hãy cập nhật theo chế độ cài đặt đang có. Không đổi giữa tài khoản hiện tại và tất cả người dùng khi cài đè EduMaster."
    ${EndIf}
    SetErrorLevel 6
    Quit
  ${EndIf}
  ClearErrors
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
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
!macroend
!endif
