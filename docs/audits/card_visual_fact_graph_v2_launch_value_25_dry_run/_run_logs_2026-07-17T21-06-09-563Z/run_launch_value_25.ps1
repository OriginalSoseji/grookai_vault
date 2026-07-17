$ErrorActionPreference = 'Stop'
Set-Location 'C:\grookai_vault_card_desc_agent'
$env:DOTENV_CONFIG_PATH = 'C:\grookai_vault\.env.local'
$env:OPENAI_INPUT_COST_PER_MILLION = '0.4'
$env:OPENAI_OUTPUT_COST_PER_MILLION = '1.6'
$env:OPENAI_CACHED_INPUT_COST_PER_MILLION = '0.1'
$env:OPENAI_IMAGE_COST_RULE_VERSION = 'official-openai-pricing-gpt-4.1-mini-2026-07-17'
node -r dotenv/config scripts/audits/card_visual_description_agent_v1.mjs --dry-run --provider=openai --model=gpt-4.1-mini --image-detail=high --branch-stratified-sample --branch-targets=pokemon:10,trainer:7,stadium:4,item_tool_supporter:4 --branch-candidate-limit=5000 --max-cards=25 --max-run-cost-usd=0.35 --out-dir=docs/audits/card_visual_fact_graph_v2_launch_value_25_dry_run
