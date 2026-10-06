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
    [DllImport("user32.dll")] static extern int GetWindowRgn(IntPtr w, IntPtr region);
    [DllImport("user32.dll")] static extern int SetWindowRgn(IntPtr w, IntPtr region, bool redraw);
    [DllImport("gdi32.dll")] static extern IntPtr CreateRectRgn(int left, int top, int right, int bottom);
    [DllImport("gdi32.dll")] static extern IntPtr CreateRoundRectRgn(int left, int top, int right, int bottom, int ellipseWidth, int ellipseHeight);
    [DllImport("gdi32.dll")] static extern int CombineRgn(IntPtr result, IntPtr first, IntPtr second, int mode);
    [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr obj);

    static IntPtr window, owner, oldOwner;
    static long oldStyle, oldExStyle;
    static uint windowPid, ownerPid;
    static RECT oldRect;
    static bool wasVisible;
    static IntPtr oldRegion;
    static bool regionCaptured;
    static string regionKey;

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
            oldRegion = CreateRectRgn(0, 0, 0, 0);
            if (oldRegion == IntPtr.Zero) throw new InvalidOperationException("Cannot capture slideshow region");
            if (GetWindowRgn(window, oldRegion) == 0) { DeleteObject(oldRegion); oldRegion = IntPtr.Zero; }
            regionCaptured = true;
            ShowWindow(window, 0);
            // Set the OWNER, not SetParent/WS_CHILD: avoid cross-process DPI resets.
            SetLong(window, -8, owner.ToInt64());
            if (GetLong(window, -8) != owner) throw new InvalidOperationException("Cannot assign slideshow owner");
            SetLong(window, -16, oldStyle & ~0x00CF0000L); // caption, frame, system/min/max buttons
            SetLong(window, -20, (oldExStyle & ~0x00040008L) | 0x00000080L); // tool window, no appwindow/topmost
            if (!SetWindowPos(window, new IntPtr(-2), rect.Left, rect.Top, rect.Right-rect.Left, rect.Bottom-rect.Top, 0x0030)) throw new InvalidOperationException("Cannot frame slideshow");
        } catch { Detach(); throw; }
    }

    static void Mask(int width, int height, int[] overlays) {
        if (overlays == null || overlays.Length % 5 != 0 || overlays.Length > 60) throw new InvalidOperationException("Invalid overlay regions");
        string key = width + ":" + height + ":" + String.Join(",", overlays);
        if (regionKey == key) return;
        IntPtr region = CreateRectRgn(0, 0, width, height);
        if (region == IntPtr.Zero) throw new InvalidOperationException("Cannot create slideshow region");
        try {
            for (int i = 0; i < overlays.Length; i += 5) {
                int left = overlays[i], top = overlays[i+1], w = overlays[i+2], h = overlays[i+3], radius = overlays[i+4];
                if (Math.Abs((long)left) > 32768 || Math.Abs((long)top) > 32768 || w < 1 || h < 1 || w > 32768 || h > 32768 || radius < 0 || radius > Math.Min(w, h)/2) throw new InvalidOperationException("Invalid overlay bounds");
                IntPtr hole = radius > 0 ? CreateRoundRectRgn(left, top, left+w+1, top+h+1, radius*2, radius*2) : CreateRectRgn(left, top, left+w, top+h);
                if (hole == IntPtr.Zero) throw new InvalidOperationException("Cannot create overlay region");
                try { if (CombineRgn(region, region, hole, 4) == 0) throw new InvalidOperationException("Cannot combine overlay regions"); } // RGN_DIFF
                finally { DeleteObject(hole); }
            }
            if (SetWindowRgn(window, region, true) == 0) throw new InvalidOperationException("Cannot apply overlay regions");
            region = IntPtr.Zero; // Windows owns the region after SetWindowRgn succeeds.
            regionKey = key;
        } finally { if (region != IntPtr.Zero) DeleteObject(region); }
    }

    public static bool Layout(int x, int y, int width, int height, bool visible, int[] overlays) {
        if (!Alive()) return false;
        if (!IsWindow(owner) || Pid(owner) != ownerPid) { Detach(); return false; }
        if (!visible || !IsWindowVisible(owner) || IsIconic(owner)) { ShowWindow(window, 0); return true; }
        if (width < 1 || height < 1 || width > 16384 || height > 16384) throw new InvalidOperationException("Invalid bounds");
        if (!SetWindowPos(window, IntPtr.Zero, x, y, width, height, 0x0034)) throw new InvalidOperationException("Cannot move slideshow");
        try { Mask(width, height, overlays); }
        catch { ShowWindow(window, 0); throw; } // Keep EduICT controls reachable if clipping fails.
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
            if (regionCaptured && SetWindowRgn(window, oldRegion, true) != 0) oldRegion = IntPtr.Zero;
            if (wasVisible) ShowWindow(window, 8);
        }
        window = IntPtr.Zero; owner = IntPtr.Zero;
        if (oldRegion != IntPtr.Zero) { DeleteObject(oldRegion); oldRegion = IntPtr.Zero; }
        regionKey = null;
        regionCaptured = false;
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
                'layout' {
                    $regions = New-Object 'System.Collections.Generic.List[int]'
                    foreach ($overlay in $request.overlays) {
                        $regions.Add([int]$overlay.x); $regions.Add([int]$overlay.y)
                        $regions.Add([int]$overlay.width); $regions.Add([int]$overlay.height); $regions.Add([int]$overlay.radius)
                    }
                    $alive = [EduIctSlideHost]::Layout([int]$request.x, [int]$request.y, [int]$request.width, [int]$request.height, [bool]$request.visible, $regions.ToArray())
                }
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
