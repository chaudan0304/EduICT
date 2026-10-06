#requires -Version 5.1
# Fixed native host protocol. No commands, paths or arbitrary HWNDs from the renderer.
param([Parameter(Mandatory = $true)][long]$OwnerHandle, [Parameter(Mandatory = $true)][int]$OwnerProcessId)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

try {
    Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public static class EduIctSlideHost {
    [StructLayout(LayoutKind.Sequential)] struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr w);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr w);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr w);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr w, out uint id);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr w, out RECT rect);
    [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetLong64(IntPtr w, int index);
    [DllImport("user32.dll", EntryPoint="GetWindowLongW")] static extern int GetLong32(IntPtr w, int index);
    [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")] static extern IntPtr SetLong64(IntPtr w, int index, IntPtr value);
    [DllImport("user32.dll", EntryPoint="SetWindowLongW")] static extern int SetLong32(IntPtr w, int index, int value);
    [DllImport("user32.dll", SetLastError=true)] static extern bool SetWindowPos(IntPtr w, IntPtr after, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr w, int state);
    [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);

    static IntPtr window, owner, oldOwner;
    static long oldStyle, oldExStyle;
    static uint windowPid, ownerPid;
    static RECT oldRect;
    static bool wasVisible;

    static IntPtr GetLong(IntPtr w, int index) { return IntPtr.Size == 8 ? GetLong64(w, index) : new IntPtr(GetLong32(w, index)); }
    static void SetLong(IntPtr w, int index, long value) {
        if (IntPtr.Size == 8) SetLong64(w, index, new IntPtr(value));
        else SetLong32(w, index, unchecked((int)value));
    }
    static uint Pid(IntPtr w) { uint id; GetWindowThreadProcessId(w, out id); return id; }
    static bool Alive() { return window != IntPtr.Zero && IsWindow(window) && Pid(window) == windowPid; }

    public static void Attach(long slideHandle, long ownerHandle, int expectedOwnerPid) {
        Detach();
        IntPtr next = new IntPtr(slideHandle), parent = new IntPtr(ownerHandle);
        if (!IsWindow(next) || !IsWindow(parent) || Pid(parent) != (uint)expectedOwnerPid) throw new InvalidOperationException("Invalid host window");
        uint nextPid = Pid(next);
        using (Process p = Process.GetProcessById((int)nextPid)) {
            if (!String.Equals(p.ProcessName, "POWERPNT", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Not a PowerPoint window");
        }
        SetThreadDpiAwarenessContext(new IntPtr(-4)); // per-monitor aware V2, physical screen pixels
        RECT rect;
        if (!GetWindowRect(next, out rect)) throw new InvalidOperationException("Cannot read slideshow bounds");
        if ((GetLong(next, -16).ToInt64() & 0x40000000L) != 0) throw new InvalidOperationException("Slideshow is not a top-level window");
        window = next; owner = parent; windowPid = nextPid; ownerPid = (uint)expectedOwnerPid;
        oldOwner = GetLong(window, -8); oldStyle = GetLong(window, -16).ToInt64(); oldExStyle = GetLong(window, -20).ToInt64();
        oldRect = rect; wasVisible = IsWindowVisible(window);
        try {
            ShowWindow(window, 0);
            // Set the OWNER, not SetParent/WS_CHILD: avoid cross-process DPI resets.
            SetLong(window, -8, owner.ToInt64());
            if (GetLong(window, -8) != owner) throw new InvalidOperationException("Cannot assign slideshow owner");
            SetLong(window, -16, oldStyle & ~0x00CF0000L); // caption, frame, system/min/max buttons
            SetLong(window, -20, (oldExStyle & ~0x00040008L) | 0x00000080L); // tool window, no appwindow/topmost
            if (!SetWindowPos(window, new IntPtr(-2), rect.Left, rect.Top, rect.Right-rect.Left, rect.Bottom-rect.Top, 0x0030)) throw new InvalidOperationException("Cannot frame slideshow");
        } catch { Detach(); throw; }
    }

    public static bool Layout(int x, int y, int width, int height, bool visible) {
        if (!Alive()) return false;
        if (!IsWindow(owner) || Pid(owner) != ownerPid) { Detach(); return false; }
        if (!visible || !IsWindowVisible(owner) || IsIconic(owner)) { ShowWindow(window, 0); return true; }
        if (width < 1 || height < 1 || width > 16384 || height > 16384) throw new InvalidOperationException("Invalid bounds");
        if (!SetWindowPos(window, IntPtr.Zero, x, y, width, height, 0x0034)) throw new InvalidOperationException("Cannot move slideshow");
        ShowWindow(window, 8); // show without taking focus away from EduICT controls
        return true;
    }

    public static void Detach() {
        if (Alive()) {
            ShowWindow(window, 0);
            SetLong(window, -8, IsWindow(oldOwner) ? oldOwner.ToInt64() : 0);
            SetLong(window, -16, oldStyle); SetLong(window, -20, oldExStyle);
            IntPtr after = (oldExStyle & 8) != 0 ? new IntPtr(-1) : new IntPtr(-2);
            SetWindowPos(window, after, oldRect.Left, oldRect.Top, oldRect.Right-oldRect.Left, oldRect.Bottom-oldRect.Top, 0x0030);
            if (wasVisible) ShowWindow(window, 8);
        }
        window = IntPtr.Zero; owner = IntPtr.Zero;
    }
}
'@
    [Console]::Out.WriteLine('{"ready":true}')
    while ($null -ne ($line = [Console]::In.ReadLine())) {
        $request = $null
        try {
            if ($line.Length -gt 4096) { throw 'Request too long' }
            $request = $line | ConvertFrom-Json
            switch ($request.action) {
                'attach' { [EduIctSlideHost]::Attach([long]$request.windowHandle, $OwnerHandle, $OwnerProcessId); $alive = $true }
                'layout' { $alive = [EduIctSlideHost]::Layout([int]$request.x, [int]$request.y, [int]$request.width, [int]$request.height, [bool]$request.visible) }
                'detach' { [EduIctSlideHost]::Detach(); $alive = $false }
                'quit' { [EduIctSlideHost]::Detach(); break }
                default { throw 'Unsupported action' }
            }
            [Console]::Out.WriteLine((@{ id = $request.id; ok = $true; alive = $alive } | ConvertTo-Json -Compress))
            if ($request.action -eq 'quit') { break }
        } catch {
            [Console]::Error.WriteLine('[powerpoint-host] ' + $_.Exception.Message)
            [Console]::Out.WriteLine((@{ id = $request.id; ok = $false; code = 'POWERPOINT_EMBED_FAILED' } | ConvertTo-Json -Compress))
        }
    }
} catch {
    [Console]::Error.WriteLine('[powerpoint-host] ' + $_.Exception.Message)
    [Console]::Out.WriteLine('{"ready":false,"code":"POWERPOINT_EMBED_FAILED"}')
} finally {
    if ('EduIctSlideHost' -as [type]) { [EduIctSlideHost]::Detach() }
}
