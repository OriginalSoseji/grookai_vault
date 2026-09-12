# This helper's stdout must be captured in memory by the authorized caller, never logged.
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class CollectorCredential {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Entry {
  public uint Flags; public uint Type; public string TargetName; public string Comment;
  public long LastWritten; public uint Size; public IntPtr Blob; public uint Persist;
  public uint Count; public IntPtr Attributes; public string Alias; public string User;
 }
 [DllImport("advapi32", CharSet=CharSet.Unicode, SetLastError=true)]
 public static extern bool CredRead(string target,uint type,int flags,out IntPtr entry);
 [DllImport("advapi32")] public static extern void CredFree(IntPtr entry);
 public static string Read() {
  IntPtr pointer;
  if(!CredRead("Supabase CLI:supabase",1,0,out pointer)) throw new Exception("Supabase CLI credential unavailable");
  try { var e=Marshal.PtrToStructure<Entry>(pointer);var bytes=new byte[e.Size];Marshal.Copy(e.Blob,bytes,0,bytes.Length);return System.Text.Encoding.UTF8.GetString(bytes); }
  finally {CredFree(pointer);}
 }
}
'@
[Console]::Write([CollectorCredential]::Read())
