# Grookai Dex Route Smoke

Generated: 2026-05-18T16:21:59.319Z

## Results

### Feature Flag Off

- /dex: status 404, 82 ms, body 9627 bytes, Grookai Dex=false, known-user leak=false
- /dex/pikachu: status 404, 90 ms, body 10198 bytes, Grookai Dex=false, known-user leak=false

### Feature Flag On

- /dex: status 200, 1096 ms, body 132204 bytes, Grookai Dex=true, known-user leak=false
- /dex/pikachu: status 200, 926 ms, body 465970 bytes, Grookai Dex=true, known-user leak=false
- /dex/pikachu?view=owned: status 200, 537 ms, body 25126 bytes, Grookai Dex=true, known-user leak=false
- /dex/pikachu?view=missing: status 200, 439 ms, body 466014 bytes, Grookai Dex=true, known-user leak=false
- /dex/charizard: status 200, 242 ms, body 293714 bytes, Grookai Dex=true, known-user leak=false
