#!/usr/bin/env python3
"""Developer helper: generate a frontend http.ts scaffold (not used at runtime)."""
import os

def main():
    http_content = "// See frontend/src/lib/http.ts in the unified repo. This helper is deprecated.\n"
    out = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "lib", "http.ts")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(http_content)
    print(f"Wrote placeholder http.ts to {out}")

if __name__ == "__main__":
    main()
