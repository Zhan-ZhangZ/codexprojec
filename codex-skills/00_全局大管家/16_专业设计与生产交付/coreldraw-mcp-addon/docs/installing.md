# Installing the CorelDRAW MCP add-on

Three ways to deploy the add-on into `<CorelDRAW>\Programs64\Addons\CorelMcp`:

| Method | Use it for |
|---|---|
| **MSI package** (recommended) | End users / distribution. Registered in Add/Remove Programs, upgrades cleanly, discovers the CorelDRAW path automatically. |
| **PowerShell script** (`deploy/install.ps1`) | Local development — builds and copies files in one step. |
| **Hand copy** | Machines where no installer may be run. The add-on is just a folder with a marker file — see [Installing by hand](#installing-by-hand-no-msi). |

Both require **administrator rights** (the add-on lives under `Program Files`).

---

## Building the MSI

```powershell
# from the repository root
.\installer\build-msi.ps1                          # CorelDRAW 27, English + Russian packages
.\installer\build-msi.ps1 -CorelDrawVersion 26     # targets CorelDRAW 2025
.\installer\build-msi.ps1 -Version 1.1.0           # force a specific product version
.\installer\build-msi.ps1 -Culture en-US           # only the English package
```

Output: `dist\CorelMcpAddon-<CorelDrawVersion>.msi` (first culture, English by default) and
`dist\CorelMcpAddon-<CorelDrawVersion>-ru.msi` (the other culture). Both install the same payload
and differ only in UI language.

**Sign the package before distributing it.** Without a signature every user meets SmartScreen's
"Unknown publisher" prompt:

```powershell
.\installer\build-msi.ps1 -PfxPath .\cert.pfx -PfxPassword '…'   # certificate file
.\installer\build-msi.ps1 -Thumbprint 1A2B3C…                    # certificate in the user store
```

`build-msi.ps1` runs `signtool sign` with an RFC 3161 timestamp and then `signtool verify /pa`;
it prints a warning when the package is left unsigned. `-TimestampUrl` overrides the default
(`http://timestamp.digicert.com`).

The product version is bumped automatically (patch +1) whenever the add-on sources or the
`.wxs` change, and only after a successful build; the current version is kept in
`installer\version.txt`. Packages for both CorelDRAW versions built from the same revision
share one version. The add-on assembly is built with the same version, so its `FileVersion`
increases too.

The script builds the add-on assembly first (`-SkipBuild` reuses the last build), restores
the local WiX tool, and runs `wix build`.

`-CorelDrawVersion` maps to the CorelDRAW install folder and its registry key:

| Value | CorelDRAW release |
|---|---|
| `26` | CorelDRAW Graphics Suite 2025 |
| `27` | CorelDRAW Graphics Suite 2026 |

## Installing

Double-clicking the MSI, or:

```powershell
# interactive
msiexec /i "dist\CorelMcpAddon-27.msi"

# Russian UI
msiexec /i "dist\CorelMcpAddon-27-ru.msi"

# silent, with a log
msiexec /i "dist\CorelMcpAddon-27.msi" /qn /l*v install.log
```

Pick the package in the language you want the dialogs in; both install the same files. The
package shows the standard WiX dialog sequence: **welcome + licence agreement → progress
→ finish**. The licence text lives in `installer\EULA.rtf` (English) and
`installer\EULA.ru.rtf` (Russian), and the installer is fully one language or the other — never a
mixture.

If an older version is already installed, an **upgrade confirmation** page is shown first
(«… is already installed. It will be updated to version X. Your config.json settings are kept. Choose Next to continue, or Cancel to quit.») before the welcome page,
so an update is never applied silently.

Because the package is `perMachine`, the **Install** button raises the Windows UAC prompt;
accept it to continue.

### What you will see before the installer starts

Two Windows prompts come first, and neither means something is wrong:

1. **“Windows protected your PC”** — SmartScreen, shown for any package whose publisher
   Windows does not recognise. Choose **More info → Run anyway**. A package released from this
   repository is signed only if its publisher built it with a certificate
   (`installer\build-msi.ps1 -PfxPath …` or `-Thumbprint …`); an unsigned build always produces
   this prompt.
2. **“Do you want to allow this app to make changes to your device?”** — UAC, because the
   add-on is installed per machine into `Program Files`.

If you would rather not run an installer at all, use
[Installing by hand](#installing-by-hand-no-msi) — the payload is a folder with a marker file.

> If you previously ran an older build that had no UI, the install appeared to do nothing
> ("the MSI just closes"). That build had no dialog sequence at all — a silent install is
> indistinguishable from a failed one. The current package always shows its dialogs, and any
> problem (for example *"CorelDRAW 27 was not found"*) is reported in a message box.

### Closing CorelDRAW

The add-on files cannot be replaced while CorelDRAW has them open, so the package always
**asks first**. If `CorelDrw.exe` is running you get an **Abort / Retry / Ignore** prompt:

- **Retry** — re-check; use it after closing CorelDRAW yourself.
- **Ignore** — let the installer close it for you. A graceful close message is sent, so
  CorelDRAW can still ask you to save your work; the installer waits up to 30 seconds.
- **Abort** — cancel the installation.

CorelDRAW is never force-terminated and no reboot is ever requested.

> Unattended installs (`/qn`) cannot show the prompt, so close CorelDRAW beforehand.

Uninstall:

```powershell
msiexec /x "dist\CorelMcpAddon-27.msi"
```

After installing or uninstalling, start CorelDRAW and open
**Window ▸ Dockers ▸ Corel MCP** (or **Tools ▸ Corel MCP**).

Opening the docker is what starts the server — and once the docker is *docked* in the workspace,
CorelDRAW creates it while starting up, so the endpoint comes up by itself and no click is needed.
Closing the docker again makes the start on demand: it then comes up the next time the docker is
opened. Either way the add-on's log records which path fired — it is written next to the add-on
as `corelmcp.log`, with `%LOCALAPPDATA%\CorelMcp\corelmcp.log` as the fallback when that folder
is not writable, which is the case for every MSI install: `Program Files` is not writable for a
non-elevated CorelDRAW, so that fallback is the file you will find. `server_status` reports the
file it is actually writing to (`logPath`), and the same lines are mirrored in the docker's
**Log** pane. The `addon` entry point (`CGS.Addon`) is not called by CorelDRAW in this
configuration; the docker's own constructor is the start path.

## Installing by hand (no MSI)

An add-on is registered nowhere: CorelDRAW loads it because a folder under
`<CorelDRAW>\Programs64\Addons\` contains a **zero-byte** `Coreldrw.addon` marker. Every add-on
CorelDRAW itself ships works exactly this way, so copying the payload by hand is a legitimate
deployment — no installer, no registry entries, no script.

```powershell
# elevated PowerShell
$src = "src\CorelMcpAddon\bin\Release"
$dst = "<CorelDRAW>\Programs64\Addons\CorelMcp"   # any folder name
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\CorelMcp.dll", "$src\Coreldrw.addon", "$src\AppUI.xslt",
          "$src\UserUI.xslt", "$src\config.json" $dst -Force
```

Close CorelDRAW first — the files cannot be replaced while it holds them open — then start it again
and open the docker as above. To uninstall, delete the folder.

| | |
|---|---|
| Required | the folder under `<CorelDRAW>\Programs64\Addons\`; `Coreldrw.addon`; `CorelMcp.dll`; `AppUI.xslt` and `UserUI.xslt` |
| Optional | `config.json` — the add-on writes its defaults when the file is absent |

A marker file is per application: `Coreldrw.addon` is what makes **CorelDRAW** load the folder,
while Corel PHOTO-PAINT looks for `CorelPP.addon` (several of Corel's own add-ons carry both). This
add-on is CorelDRAW-only, so only the first is needed.

Limits worth knowing:

- **Administrator rights are still required**: `Programs64\Addons` sits under `Program Files`, and
  CorelDRAW scans no per-user add-on folder — `%APPDATA%`, `%LOCALAPPDATA%` and `%ProgramData%` are
  not searched.
- Build the DLL for the CorelDRAW version being deployed into (`-p:CorelDrawVersion=26` or `27`);
  the two releases ship different `Corel.Interop.VGCore.dll` assemblies.
- Only the installation’s own `Addons` directory is scanned, so the add-on cannot be run from an
  arbitrary folder.
- Unlike the package, a hand copy leaves no Add/Remove Programs entry, does not bump the version,
  asks nothing before replacing files, and does not preserve `config.json` across an update.
  `Corel.Interop.VGCore.dll` is deliberately **not** part of the payload (`<Private>false</Private>`),
  so nothing else belongs in the folder.

## How the package is built (maintainers and forks)

- **Discovers the target itself.** It reads
  `HKLM\SOFTWARE\Corel\CorelDRAW\<version>\ProgramsDir` (64-bit view) at install time, so
  non-default CorelDRAW install locations work without rebuilding. If the targeted
  CorelDRAW version is absent, the install stops with an explanatory message instead of
  dropping files in the wrong place.
- **Installs exactly these files** into `…\Programs64\Addons\CorelMcp\`:

  | File | Purpose |
  |---|---|
  | `CorelMcp.dll` | the add-on and in-process MCP server |
  | `Coreldrw.addon` | marker that makes CorelDRAW load the add-on |
  | `AppUI.xslt`, `UserUI.xslt` | docker panel and menu registration |
  | `config.json` | user settings (port, bind address, auth token, disabled tools) |

  The add-on has **no third-party runtime dependencies** — the JSON layer used by the MCP
  protocol is built in, so nothing else is dropped into the CorelDRAW install.

- **Per-version product identity.** Each CorelDRAW version is a separate product line
  (deterministic `UpgradeCode` and component GUIDs derived from the version number), so the
  `26` and `27` packages can be installed side by side and will not upgrade each other.
  A newer build of the *same* CorelDRAW version upgrades in place.
- **Preserves `config.json`.** The component is `Permanent` + `NeverOverwrite`, so a
  customised port or auth token survives an upgrade **and** an uninstall. `MajorUpgrade`
  schedules `RemoveExistingProducts` after `InstallValidate` (the old product is removed
  before the new files are installed), which is what makes an upgrade actually replace
  `CorelMcp.dll`; the permanent component is what keeps `config.json` through that removal.
- **Appears in Add/Remove Programs** as *"CorelDRAW MCP Add-on (CorelDRAW 27)"*, published by
  `pefedotov`, with the add-on's own icon, a *Support* link to the issue tracker and a *Comments*
  line. A standard dialog sequence means successes and failures are both visible.
- **One package per language.** The UI, the custom upgrade dialog, the licence and the error
  messages come from `installer/Strings.<culture>.wxl`, so a package is fully English
  (`CorelMcpAddon-27.msi`, `ProductLanguage` 1033) or fully Russian
  (`CorelMcpAddon-27-ru.msi`, 1049) — never a mixture. `installer\build-msi.ps1 -Culture en-US`
  builds just one.

## Verifying a package without installing it

```powershell
# extracts the payload to a folder; needs no admin rights and does not touch CorelDRAW
msiexec /a "dist\CorelMcpAddon-27.msi" TARGETDIR="$env:TEMP\msitest" /qn
Get-ChildItem "$env:TEMP\msitest\CorelPrograms\Addons\CorelMcp"
```

`CorelPrograms` is replaced by the real `ProgramsDir` value during a normal install.

## Requirements

- **WiX Toolset v5** — restored automatically as a local dotnet tool
  (`dotnet-tools.json` at the repository root; run `dotnet tool restore` if needed).
  The build uses the **Util** and **UI** extensions, which `build-msi.ps1` adds on demand.
  WiX v7+ is deliberately **not** used because it requires accepting the Open Source
  Maintenance Fee licence.
- **.NET SDK** capable of building `net48` (verified with .NET 10 SDK) and, for the build
  machine only, the CorelDRAW install that provides `Corel.Interop.VGCore.dll`.
