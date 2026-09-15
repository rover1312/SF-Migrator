"""CSV cleaning and preparation for Salesforce migration.

- Keeps only allow-listed columns (plus the source Id, preserved as
  __source_id); unknown columns are dropped and reported.
- Trims whitespace; normalizes empty-like values ("", "nan", "none",
  "null", case-insensitive) to empty.
- Validates boolean fields (true/t/1/yes/y, false/f/0/no/n) and date
  fields (normalized to YYYY-MM-DD); invalid rows are dropped from the
  output and recorded in the errors file.
- Adds missing allow-listed columns as empty values.

Prints a JSON summary to stdout:
{"total": N, "ready": N, "failed": N, "errors_file": path}

Usage:
    python cleaner.py --in Account.csv --out Account.clean.csv \\
        --errors Account.errors.csv --allow Id,Name,Active,Created \\
        --booleans Active --dates Created
"""

import argparse
import csv
import json
import sys
from datetime import datetime

NULL_LIKES = {"", "nan", "none", "null", "na", "n/a"}
TRUE_VALUES = {"true", "t", "1", "yes", "y"}
FALSE_VALUES = {"false", "f", "0", "no", "n"}
DATE_FORMATS = ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S")


def normalize(value):
    """Trim and convert null-like strings to empty."""
    text = (value or "").strip() if isinstance(value, str) else value
    if isinstance(text, str) and text.lower() in NULL_LIKES:
        return ""
    return text


def convert_boolean(value):
    """Return 'true'/'false'/'' or raise ValueError."""
    if value == "":
        return ""
    lowered = value.lower()
    if lowered in TRUE_VALUES:
        return "true"
    if lowered in FALSE_VALUES:
        return "false"
    raise ValueError("invalid boolean: %r" % value)


def convert_date(value):
    """Normalize to YYYY-MM-DD or raise ValueError."""
    if value == "":
        return ""
    text = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text[: len(fmt)], fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # ISO datetimes with timezone/offset fall back to date prefix check.
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except ValueError:
        raise ValueError("invalid date: %r" % value)


def clean_file(in_path, out_path, errors_path, allowed, booleans, dates):
    """Clean one CSV; return (total, ready_rows, error_rows)."""
    allowed_set = set(allowed)
    errors = []
    ready = []
    with open(in_path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("Input file %s has no header row" % in_path)
        dropped = [c for c in reader.fieldnames if c not in allowed_set and c != "Id"]
        for lineno, row in enumerate(reader, start=2):
            source_id = row.get("Id", "")
            out = {"__source_id": source_id}
            problems = []
            for col in allowed:
                if col == "Id":
                    continue
                value = normalize(row.get(col, ""))
                try:
                    if col in booleans:
                        value = convert_boolean(value)
                    elif col in dates:
                        value = convert_date(value)
                except ValueError as exc:
                    problems.append(str(exc))
                out[col] = value
            if problems:
                errors.append({"row": lineno, "__source_id": source_id, "error": "; ".join(problems)})
            else:
                ready.append(out)

    out_fields = ["__source_id"] + [c for c in allowed if c != "Id"]
    with open(out_path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=out_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(ready)
    with open(errors_path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["row", "__source_id", "error"])
        writer.writeheader()
        writer.writerows(errors)
    total = len(ready) + len(errors)
    return total, ready, errors


def split_list(value):
    """Split a comma list, dropping empties."""
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--in", dest="in_path", required=True)
    parser.add_argument("--out", dest="out_path", required=True)
    parser.add_argument("--errors", dest="errors_path", required=True)
    parser.add_argument("--allow", default="", help="Comma-separated allow-listed columns")
    parser.add_argument("--booleans", default="", help="Comma-separated boolean columns")
    parser.add_argument("--dates", default="", help="Comma-separated date columns")
    args = parser.parse_args(argv)

    total, ready, errors = clean_file(
        args.in_path, args.out_path, args.errors_path,
        split_list(args.allow), set(split_list(args.booleans)), set(split_list(args.dates)),
    )
    print(json.dumps({"total": total, "ready": len(ready), "failed": len(errors),
                      "errors_file": args.errors_path}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
