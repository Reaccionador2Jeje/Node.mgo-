; Node.mgo Windows installer (Inno Setup)
#define AppName "Node.mgo"
#define AppVersion "0.1.0-dev"
#define AppPublisher "Atdev Dev"
#define AppExeName "node_mgo.exe"

[Setup]
AppId={{8D5B9C3C-4F31-4B50-9C53-8E6A70A4B90B}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\Node.mgo
DefaultGroupName=Node.mgo
OutputDir=..\..\dist
OutputBaseFilename=Node.mgo-Setup-Windows-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\{#AppExeName}
SetupLogging=yes

[Files]
Source: "..\..\dist\node_mgo.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Node.mgo Terminal"; Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall Node.mgo"; Filename: "{uninstallexe}"

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; ValueData: "{olddata};{app}"; Flags: preservestringtype

[Code]
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  PathValue: string;
  InstallPath: string;
  P: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    InstallPath := ExpandConstant('{app}');
    if RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', PathValue) then
    begin
      P := Pos(';' + InstallPath, ';' + PathValue);
      if P > 0 then
        Delete(PathValue, P, Length(InstallPath) + 1);
      RegWriteStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', PathValue);
    end;
  end;
end;
