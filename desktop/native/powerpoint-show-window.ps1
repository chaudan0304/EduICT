# Native HWND discovery for the exact slideshow started by the bridge.
# Loaded only by StartEmbeddedShow; no renderer-supplied commands or handles.
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
public static class EduIctShowWindow {
    delegate bool EnumCallback(IntPtr w, IntPtr data);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumCallback callback, IntPtr data);
    [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr parent, EnumCallback callback, IntPtr data);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr w);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr w);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr w, out uint processId);
    [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr w, uint flags);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr w, StringBuilder name, int length);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr w, StringBuilder text, int length);
    static uint Pid(IntPtr w) { uint id; GetWindowThreadProcessId(w, out id); return id; }
    static bool Screen(IntPtr w) { var name = new StringBuilder(256); GetClassName(w, name, name.Capacity); return String.Equals(name.ToString(), "screenClass", StringComparison.OrdinalIgnoreCase); }
    static bool HasScreen(IntPtr w, int processId) {
        if (Screen(w)) return true;
        bool found = false;
        EnumChildWindows(w, (child, data) => { if (Pid(child) == (uint)processId && Screen(child)) { found = true; return false; } return true; }, IntPtr.Zero);
        return found;
    }
    public static int PowerPointProcess(long editorHandle) {
        if (editorHandle != 0 && IsWindow(new IntPtr(editorHandle))) {
            int id = (int)Pid(new IntPtr(editorHandle));
            using (Process p = Process.GetProcessById(id)) {
                if (String.Equals(p.ProcessName, "POWERPNT", StringComparison.OrdinalIgnoreCase)) return id;
            }
        }
        var processes = Process.GetProcessesByName("POWERPNT");
        try { return processes.Length == 1 ? processes[0].Id : 0; }
        finally { foreach (var process in processes) process.Dispose(); }
    }
    public static long[] VisibleRoots(int processId, bool showsOnly) {
        var roots = new List<long>();
        EnumWindows((w, data) => {
            if (Pid(w) == (uint)processId && IsWindowVisible(w) && (!showsOnly || HasScreen(w, processId))) roots.Add(w.ToInt64());
            return true;
        }, IntPtr.Zero);
        return roots.ToArray();
    }
    public static long Resolve(long comHandle, int processId, long[] before) {
        if (comHandle == 0) return 0;
        if (before == null) before = new long[0];
        IntPtr w = new IntPtr(comHandle);
        if (!IsWindow(w) || Pid(w) != (uint)processId) return 0;
        IntPtr root = GetAncestor(w, 2); // GA_ROOT, not an editor/owner ancestor.
        if (root == IntPtr.Zero || Pid(root) != (uint)processId || !IsWindowVisible(root)) return 0;
        // A known top-level screenClass is safe even if PowerPoint reused its HWND.
        // A frame containing a screen must be newly visible; never dock the editor.
        if (Screen(root) || (Array.IndexOf(before, root.ToInt64()) < 0 && HasScreen(root, processId))) return root.ToInt64();
        return 0;
    }
    public static bool MatchesPresentation(long handle, string fileName) {
        if (String.IsNullOrEmpty(fileName)) return false;
        var title = new StringBuilder(1024); GetWindowText(new IntPtr(handle), title, title.Capacity);
        string stem = System.IO.Path.GetFileNameWithoutExtension(fileName);
        return title.ToString().IndexOf(fileName, StringComparison.OrdinalIgnoreCase) >= 0 ||
            (!String.IsNullOrEmpty(stem) && title.ToString().IndexOf(stem, StringComparison.OrdinalIgnoreCase) >= 0);
    }
}
'@

function Convert-PptHwnd($Value) {
    $handle = [long]$Value
    if ($handle -lt 0) { $handle += 4294967296 }
    return $handle
}

function Read-PptComHwnd($ComObject) {
    $handle = 0
    try { $handle = Convert-PptHwnd $ComObject.HWND } catch { }
    if ($handle -eq 0) {
        # Invoke the COM property explicitly if the PowerShell adapter omits it.
        try { $handle = Convert-PptHwnd ($ComObject.GetType().InvokeMember('HWND', [System.Reflection.BindingFlags]::GetProperty, $null, $ComObject, $null)) } catch { }
        if ($handle -ne 0) { [Console]::Error.WriteLine('[powerpoint-bridge] HWND resolved through explicit COM property access') }
    }
    return $handle
}

function Get-StartedSlideShowHandle($Window, $Presentation, [int]$ProcessId, [long[]]$Before, [bool]$AllowTitleMatch) {
    for ($attempt = 0; $attempt -lt 50; $attempt++) {
        # Run() can return before the native slideshow HWND is available.
        $comHandle = 0
        $comHandle = Read-PptComHwnd $Window
        if ($comHandle -eq 0) { try { $comHandle = Read-PptComHwnd $Presentation.SlideShowWindow } catch { } }
        $resolved = [EduIctShowWindow]::Resolve($comHandle, $ProcessId, $Before)
        if ($resolved -ne 0) { return $resolved }
        # Fail closed if there is more than one new candidate (e.g. concurrent shows).
        $candidates = @()
        if ($AllowTitleMatch) {
            $candidates = @([EduIctShowWindow]::VisibleRoots($ProcessId, $true) | Where-Object { $Before -notcontains $_ -and [EduIctShowWindow]::MatchesPresentation($_, [string]$Presentation.Name) })
        }
        if ($candidates.Count -eq 1) {
            [Console]::Error.WriteLine('[powerpoint-bridge] HWND resolved by native window enumeration')
            return [long]$candidates[0]
        }
        if ($candidates.Count -gt 1) { throw 'Ambiguous new PowerPoint slideshow windows' }
        Start-Sleep -Milliseconds 100
    }
    $showRootCount = @([EduIctShowWindow]::VisibleRoots($ProcessId, $true)).Count
    throw "No matching native slideshow window after 5 seconds (process=$ProcessId, com=$comHandle, shows=$showRootCount, matches=$($candidates.Count))"
}
