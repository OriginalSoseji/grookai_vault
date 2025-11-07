# Functions Status

## pricing_refresh deploy output

ExitCode: 0

### STDOUT
```$([Environment]::NewLine)Deployed Functions on project ycdxbpibncqcchqiihfz: pricing_refresh
You can inspect your deployment in the Dashboard: https://supabase.com/dashboard/project/ycdxbpibncqcchqiihfz/functions

```

### STDERR
```$([Environment]::NewLine)Bundling Function: pricing_refresh
v1.69.15: Pulling from supabase/edge-runtime
ac95a5b6c58f: Pulling fs layer
62ba96cfbdaa: Pulling fs layer
35275192c7e1: Pulling fs layer
49b1cdd36cf6: Pulling fs layer
99dc80d20129: Pulling fs layer
abe1fea37542: Pulling fs layer
ac95a5b6c58f: Download complete
99dc80d20129: Download complete
35275192c7e1: Download complete
abe1fea37542: Download complete
62ba96cfbdaa: Download complete
abe1fea37542: Pull complete
ac95a5b6c58f: Pull complete
35275192c7e1: Pull complete
49b1cdd36cf6: Download complete
99dc80d20129: Pull complete
49b1cdd36cf6: Pull complete
62ba96cfbdaa: Pull complete
Digest: sha256:a0a19171f8a5dcc27384056db83c6c0c73c5beb44f3e54f3b2ca3d77c43e2b45
Status: Downloaded newer image for public.ecr.aws/supabase/edge-runtime:v1.69.15
Specifying import_map through flags is no longer supported. Please use deno.json instead.
Specifying decorator through flags is no longer supported. Please use deno.json instead.
Deploying Function: pricing_refresh (script size: 2.61kB)

```

Verify schedule from Supabase Studio → Functions (schedule.json: */15)

