"""ID lookup resolution for Salesforce migration.

Replaces source-org lookup IDs in a child CSV with target-org IDs using a
previously generated parent ID map.

ID map format (CSV): source_id,target_id
Child input (CSV):   any columns; the lookup field holds source IDs.

Output: resolved CSV where the lookup field holds target IDs and the
original value is preserved as __orig_<field>. A JSON summary is printed
to stdout: {"total": N, "resolved": N, "missing": N, "missing_ids": [...]}.

Missing-lookup behaviors (--on-missing):
  fail  unresolved rows are dropped from output and counted as missing
  null  unresolved lookups are emptied (field set to "")
  keep  unresolved values are passed through unchanged (dangerous:
        sends source-org IDs to the target)

Usage:
    python id_resolver.py --child Contact.csv --parent-map Account_idmap.csv \\
        --field AccountId --out Contact.resolved.csv --on-missing fail
"""

import argparse
import csv
import json
import sys


def load_id_map(path):
    """Load source_id -> target_id mapping from a CSV file."""
    mapping = {}
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None or "source_id" not in reader.fieldnames:
            raise ValueError("ID map %s needs a source_id column" % path)
        target_col = "target_id" if "target_id" in reader.fieldnames else None
        if target_col is None:
            raise ValueError("ID map %s needs a target_id column" % path)
        for row in reader:
            if row["source_id"]:
                mapping[row["source_id"]] = row[target_col]
    return mapping


def resolve_lookups(child_path, id_map, field, out_path, on_missing):
    """Resolve one lookup field; return (total, resolved, missing_ids)."""
    total = 0
    resolved = 0
    missing_ids = []
    orig_col = "__orig_" + field
    with open(child_path, newline="", encoding="utf-8") as src:
        reader = csv.DictReader(src)
        if reader.fieldnames is None:
            raise ValueError("Child file %s has no header row" % child_path)
        if field not in reader.fieldnames:
            raise ValueError("Child file %s has no column %s" % (child_path, field))
        out_fields = list(reader.fieldnames)
        if orig_col not in out_fields:
            out_fields.append(orig_col)
        with open(out_path, "w", newline="", encoding="utf-8") as dst:
            writer = csv.DictWriter(dst, fieldnames=out_fields, extrasaction="ignore")
            writer.writeheader()
            for row in reader:
                total += 1
                value = (row.get(field) or "").strip()
                row[orig_col] = value
                if value == "":
                    writer.writerow(row)
                    continue
                target = id_map.get(value)
                if target:
                    row[field] = target
                    resolved += 1
                    writer.writerow(row)
                elif on_missing == "null":
                    row[field] = ""
                    writer.writerow(row)
                elif on_missing == "keep":
                    writer.writerow(row)
                else:  # fail
                    if value not in missing_ids:
                        missing_ids.append(value)
    return total, resolved, missing_ids


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--child", required=True, help="Child records CSV")
    parser.add_argument("--parent-map", required=True, help="Parent ID map CSV")
    parser.add_argument("--field", required=True, help="Lookup field to resolve")
    parser.add_argument("--out", required=True, help="Resolved output CSV")
    parser.add_argument("--on-missing", default="fail", choices=["fail", "null", "keep"])
    args = parser.parse_args(argv)

    id_map = load_id_map(args.parent_map)
    total, resolved, missing_ids = resolve_lookups(
        args.child, id_map, args.field, args.out, args.on_missing
    )
    summary = {
        "total": total,
        "resolved": resolved,
        "missing": len(missing_ids),
        "missing_ids": missing_ids[:100],
    }
    print(json.dumps(summary))
    return 1 if args.on_missing == "fail" and missing_ids else 0


if __name__ == "__main__":
    sys.exit(main())
