@echo off
set "PATH=C:\Users\ccabr\scoop\shims;%PATH%"
where supabase > "C:\grookai_vault_operator_artifacts\mee_ollama_scheduled_logs\supabase-resolution.txt" 2>&1
supabase --version >> "C:\grookai_vault_operator_artifacts\mee_ollama_scheduled_logs\supabase-resolution.txt" 2>&1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\grookai_mee_governance_20261015\scripts\ops\market_evidence_ollama_automation_v1.ps1"
