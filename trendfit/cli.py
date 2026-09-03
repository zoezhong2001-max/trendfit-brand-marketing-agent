"""Command-line demo for TrendFit."""
import argparse
import json
from pathlib import Path
from .validation import validate_bundle


def main():
    parser = argparse.ArgumentParser(description="Validate a TrendFit evidence bundle")
    parser.add_argument("bundle", type=Path, nargs="?", default=Path("examples/petlibro_demo.json"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = validate_bundle(json.loads(args.bundle.read_text()))
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(text)
    print(text, end="")


if __name__ == "__main__":
    main()
