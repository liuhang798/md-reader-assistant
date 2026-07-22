Unicode true

####
## Please note: Template replacements don't work in this file. They are provided with default defines like
## mentioned underneath.
## If the keyword is not defined, "wails_tools.nsh" will populate them with the values from ProjectInfo.
## If they are defined here, "wails_tools.nsh" will not touch them. This allows to use this project.nsi manually
## from outside of Wails for debugging and development of the installer.
##
## For development first make a wails nsis build to populate the "wails_tools.nsh":
## > wails build --target windows/amd64 --nsis
## Then you can call makensis on this file with specifying the path to your binary:
## For a AMD64 only installer:
## > makensis -DARG_WAILS_AMD64_BINARY=..\..\bin\app.exe
## For a ARM64 only installer:
## > makensis -DARG_WAILS_ARM64_BINARY=..\..\bin\app.exe
## For a installer with both architectures:
## > makensis -DARG_WAILS_AMD64_BINARY=..\..\bin\app-amd64.exe -DARG_WAILS_ARM64_BINARY=..\..\bin\app-arm64.exe
####
## The following information is taken from the ProjectInfo file, but they can be overwritten here.
####
## !define INFO_PROJECTNAME    "MyProject" # Default "{{.Name}}"
## !define INFO_COMPANYNAME    "MyCompany" # Default "{{.Info.CompanyName}}"
## !define INFO_PRODUCTNAME    "MyProduct" # Default "{{.Info.ProductName}}"
## !define INFO_PRODUCTVERSION "1.0.0"     # Default "{{.Info.ProductVersion}}"
## !define INFO_COPYRIGHT      "Copyright" # Default "{{.Info.Copyright}}"
###
!define INFO_PROJECTNAME    "md-reader-assistant"
!define INFO_COMPANYNAME    "LeafMD Open Source"
!define INFO_PRODUCTNAME    "MD阅读助手"
!define INFO_PRODUCTVERSION "2.2.3"
!define INFO_COPYRIGHT      "Copyright © 2026 柳航"
###
## !define PRODUCT_EXECUTABLE  "Application.exe"      # Default "${INFO_PROJECTNAME}.exe"
## !define UNINST_KEY_NAME     "UninstKeyInRegistry"  # Default "${INFO_COMPANYNAME}${INFO_PRODUCTNAME}"
####
## !define REQUEST_EXECUTION_LEVEL "admin"            # Default "admin"  see also https://nsis.sourceforge.io/Docs/Chapter4.html
####
## Include the wails tools
####
!include "wails_tools.nsh"

# The version information for this two must consist of 4 parts
VIProductVersion "${INFO_PRODUCTVERSION}.0"
VIFileVersion    "${INFO_PRODUCTVERSION}.0"

VIAddVersionKey "CompanyName"     "${INFO_COMPANYNAME}"
VIAddVersionKey "FileDescription" "${INFO_PRODUCTNAME} Installer"
VIAddVersionKey "ProductVersion"  "${INFO_PRODUCTVERSION}"
VIAddVersionKey "FileVersion"     "${INFO_PRODUCTVERSION}"
VIAddVersionKey "LegalCopyright"  "${INFO_COPYRIGHT}"
VIAddVersionKey "ProductName"     "${INFO_PRODUCTNAME}"

# Enable HiDPI support. https://nsis.sourceforge.io/Reference/ManifestDPIAware
ManifestDPIAware true

!include "MUI.nsh"

!define MUI_ICON "..\icon.ico"
!define MUI_UNICON "..\icon.ico"
!define MUI_LANGDLL_ALLLANGUAGES
!define MUI_LANGDLL_REGISTRY_ROOT HKCU
!define MUI_LANGDLL_REGISTRY_KEY "Software\${INFO_COMPANYNAME}\${INFO_PROJECTNAME}"
!define MUI_LANGDLL_REGISTRY_VALUENAME "InstallerLanguage"
# !define MUI_WELCOMEFINISHPAGE_BITMAP "resources\leftimage.bmp" #Include this to add a bitmap on the left side of the Welcome Page. Must be a size of 164x314
!define MUI_FINISHPAGE_NOAUTOCLOSE # Wait on the INSTFILES page so the user can take a look into the details of the installation steps
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_EXECUTABLE}"
!define MUI_FINISHPAGE_RUN_TEXT "$(FinishRunText)"
!define MUI_ABORTWARNING # This will warn the user if they exit from the installer.

!insertmacro MUI_PAGE_WELCOME # Welcome to the installer page.
# !insertmacro MUI_PAGE_LICENSE "resources\eula.txt" # Adds a EULA page to the installer
!insertmacro MUI_PAGE_DIRECTORY # In which folder install page.
!insertmacro MUI_PAGE_INSTFILES # Installing page.
!insertmacro MUI_PAGE_FINISH # Finished installation page.

!insertmacro MUI_UNPAGE_INSTFILES # Uinstalling page

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"

LangString FinishRunText ${LANG_ENGLISH} "Run ${INFO_PRODUCTNAME}"
LangString FinishRunText ${LANG_SIMPCHINESE} "运行 ${INFO_PRODUCTNAME}"

## The following two statements can be used to sign the installer and the uninstaller. The path to the binaries are provided in %1
#!uninstfinalize 'signtool --file "%1"'
#!finalize 'signtool --file "%1"'

Name "${INFO_PRODUCTNAME}"
OutFile "..\..\bin\md-reader-assistant-${INFO_PRODUCTVERSION}-windows-${ARCH}.exe" # Keep release filenames ASCII-safe for CI.
Var ExistingInstall
!ifdef WAILS_INSTALL_SCOPE
  !if "${WAILS_INSTALL_SCOPE}" == "user"
    InstallDir "$LOCALAPPDATA\Programs\${INFO_PRODUCTNAME}"
  !else
    InstallDir "$PROGRAMFILES64\${INFO_COMPANYNAME}\${INFO_PRODUCTNAME}"
  !endif
!else
  InstallDir "$PROGRAMFILES64\${INFO_COMPANYNAME}\${INFO_PRODUCTNAME}"
!endif # Default installing folder ($PROGRAMFILES is Program Files folder).
InstallDirRegKey HKCU "${UNINST_KEY}" "InstallLocation"
ShowInstDetails show # This will always show the installation details.

Function .onInit
   !insertmacro wails.checkArchitecture
   Call DetectExistingInstallation
   Call ResolvePreviousInstallDir
   !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd

Function un.onInit
   !insertmacro MUI_UNGETLANGUAGE
FunctionEnd

# A first-run marker is created only when neither an installed version nor an
# existing preference file is found. Therefore upgrades from versions that did
# not have the language chooser never display it.
Function DetectExistingInstallation
    StrCpy $ExistingInstall "0"
    SetRegView 64
    ReadRegStr $0 HKCU "${UNINST_KEY}" "DisplayName"
    StrCmp $0 "" detectPreferences detectExistingFound

    detectPreferences:
        IfFileExists "$APPDATA\${INFO_PRODUCTNAME}\preferences.json" detectExistingFound detectLegacyInstall

    detectLegacyInstall:
        StrCpy $0 0
    detectLegacyLoop:
        EnumRegKey $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall" $0
        StrCmp $1 "" detectExistingDone
        ReadRegStr $2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$1" "DisplayName"
        StrCmp $2 "${INFO_PRODUCTNAME}" detectExistingFound detectLegacyNext
    detectLegacyNext:
        IntOp $0 $0 + 1
        Goto detectLegacyLoop

    detectExistingFound:
        StrCpy $ExistingInstall "1"

    detectExistingDone:
FunctionEnd

# Prefer the directory recorded by 2.2.3 and later. Version 2.2.2 did not
# write InstallLocation, so use its DisplayIcon path as an upgrade fallback.
Function ResolvePreviousInstallDir
    SetRegView 64
    ReadRegStr $0 HKCU "${UNINST_KEY}" "InstallLocation"
    StrCmp $0 "" previousInstallFromIcon previousInstallFound

    previousInstallFromIcon:
        ReadRegStr $0 HKCU "${UNINST_KEY}" "DisplayIcon"
        StrCmp $0 "" previousInstallDone
        ${GetParent} "$0" $1
        StrCmp $1 "" previousInstallDone
        StrCpy $0 "$1"

    previousInstallFound:
        StrCpy $INSTDIR "$0"

    previousInstallDone:
FunctionEnd

# Electron releases and early Wails installers used different uninstall keys
# or installation scopes. Remove only stale entries with this exact product
# name so Windows shows a single installed application after an upgrade.
Function RemoveLegacyUninstallEntries
    SetRegView 64
    StrCpy $0 0
    legacyHKCU:
        EnumRegKey $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall" $0
        StrCmp $1 "" legacyCleanupDone
        StrCmp $1 "${UNINST_KEY_NAME}" legacyHKCUNext
        ReadRegStr $2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$1" "DisplayName"
        StrCmp $2 "${INFO_PRODUCTNAME}" 0 legacyHKCUNext
        DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$1"
        Goto legacyHKCU
    legacyHKCUNext:
        IntOp $0 $0 + 1
        Goto legacyHKCU
    legacyCleanupDone:
        SetRegView 64
FunctionEnd

Section
    !insertmacro wails.setShellContext

    Call RemoveLegacyUninstallEntries

    !insertmacro wails.webview2runtime

    SetOutPath $INSTDIR

    !insertmacro wails.files

    StrCmp $ExistingInstall "1" firstRunMarkerDone
    CreateDirectory "$APPDATA\${INFO_PRODUCTNAME}"
    FileOpen $0 "$APPDATA\${INFO_PRODUCTNAME}\first-run-language.flag" w
    FileWrite $0 "new-install"
    FileClose $0
    firstRunMarkerDone:

    File "/oname=MDReaderAssistant-${INFO_PRODUCTVERSION}.ico" "..\icon.ico"

    # 2.2.2 could leave a public shortcut because its CI rebuild omitted the
    # user execution-level define. Try to remove both locations. If Windows
    # does not permit deleting the public link, keep it and do not create a
    # second per-user link.
    SetShellVarContext current
    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"
    SetShellVarContext all
    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"

    IfFileExists "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" publicStartMenuRemains createUserStartMenu
    createUserStartMenu:
        SetShellVarContext current
        CreateShortcut "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}" "" "$INSTDIR\MDReaderAssistant-${INFO_PRODUCTVERSION}.ico" 0
    publicStartMenuRemains:

    SetShellVarContext all
    IfFileExists "$DESKTOP\${INFO_PRODUCTNAME}.lnk" publicDesktopRemains createUserDesktop
    createUserDesktop:
        SetShellVarContext current
        CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}" "" "$INSTDIR\MDReaderAssistant-${INFO_PRODUCTVERSION}.ico" 0
    publicDesktopRemains:
        SetShellVarContext current
    System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'

    !insertmacro wails.associateFiles
    !insertmacro wails.associateCustomProtocols

    !insertmacro wails.writeUninstaller
    # Persist the actual directory selected by the user so future upgrades
    # open the directory page at the same location.
    SetRegView 64
    WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
SectionEnd

Section "uninstall"
    !insertmacro wails.setShellContext

    RMDir /r "$AppData\${PRODUCT_EXECUTABLE}" # Remove the WebView2 DataPath

    RMDir /r $INSTDIR

    SetShellVarContext current
    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"
    SetShellVarContext all
    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"
    SetShellVarContext current

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols

    !insertmacro wails.deleteUninstaller
SectionEnd
