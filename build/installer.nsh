!macro customInit
  ; ==========================================================================
  ; TỰ ĐỘNG GỠ BỎ PHIÊN BẢN CŨ (ExamStudio, Examora) KHI CÀI ĐẶT ExamPrep Studio
  ; Giúp Windows chỉ hiển thị DUY NHẤT 1 ứng dụng trong Control Panel
  ; ==========================================================================

  ; 1. Gỡ cài đặt bản ExamStudio cũ
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.examstudio.desktop" "UninstallString"
  ${If} $0 != ""
    ExecWait '$0 /S _?=$LOCALAPPDATA\Programs\ExamStudio'
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.examstudio.desktop"
  ${EndIf}

  ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ExamStudio" "UninstallString"
  ${If} $1 != ""
    ExecWait '$1 /S _?=$LOCALAPPDATA\Programs\ExamStudio'
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ExamStudio"
  ${EndIf}

  ; 2. Gỡ cài đặt bản Examora cũ (nếu có)
  ReadRegStr $2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.examora.desktop" "UninstallString"
  ${If} $2 != ""
    ExecWait '$2 /S _?=$LOCALAPPDATA\Programs\Examora'
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.examora.desktop"
  ${EndIf}
!macroend
