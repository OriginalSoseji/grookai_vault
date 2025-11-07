# Edge Functions Test (PROD)

| Name          | Method | Auth         | Code | OK  |
|---------------|--------|--------------|------|-----|
| import-prices | POST   | service-role | 500 | False |
| check-sets    | POST   | service-role | 200 | True |
| wall_feed     | GET    | anon         | 401 | False |

**Verdict:** RED
