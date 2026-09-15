"""Source-org extraction for Salesforce migration.

Queries a root object with an optional WHERE clause and limit, writes the
records to CSV, and prints a JSON summary to stdout:
{"object": name, "records": N, "file": path}

Credentials come from the environment (never from argv):
  SOURCE_SF_USERNAME, SOURCE_SF_PASSWORD, SOURCE_SF_SECURITY_TOKEN,
  SOURCE_SF_DOMAIN (default "login"), SOURCE_SF_API_VERSION (default "60.0").

Requires: pip install -r requirements.txt (simple-salesforce).

Usage:
    python extract.py --object Account --fields Id,Name --where "Name != ''" \\
        --limit 1000 --out ./data/extracted/Account.csv
"""

import argparse
import csv
import json
import os
import sys

try:
    from simple_salesforce import Salesforce
except ImportError:  # pragma: no cover - import guard
    Salesforce = None


def get_client():
    """Connect to the source org from SOURCE_SF_* environment variables."""
    if Salesforce is None:
        raise RuntimeError("simple-salesforce is not installed (pip install -r requirements.txt)")
    username = os.environ.get("SOURCE_SF_USERNAME", "")
    password = os.environ.get("SOURCE_SF_PASSWORD", "")
    token = os.environ.get("SOURCE_SF_SECURITY_TOKEN", "")
    domain = os.environ.get("SOURCE_SF_DOMAIN", "login")
    version = os.environ.get("SOURCE_SF_API_VERSION", "60.0")
    if not username or not password:
        raise RuntimeError("SOURCE_SF_USERNAME and SOURCE_SF_PASSWORD must be set")
    return Salesforce(username=username, password=password, security_token=token,
                      domain=domain, version=version)


def build_soql(object_name, fields, where, limit):
    """Assemble a SELECT query from validated parts."""
    select = ", ".join(fields)
    query = "SELECT %s FROM %s" % (select, object_name)
    if where:
        query += " WHERE " + where
    if limit and limit > 0:
        query += " LIMIT %d" % limit
    return query


def write_csv(records, fields, out_path):
    """Write query records to CSV, flattening nested reference objects."""
    count = 0
    with open(out_path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for record in records:
            row = {}
            for field in fields:
                value = record.get(field)
                if isinstance(value, dict):
                    value = value.get("Id", "")
                row[field] = "" if value is None else value
            writer.writerow(row)
            count += 1
    return count


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--object", dest="object_name", required=True)
    parser.add_argument("--fields", required=True, help="Comma-separated field API names")
    parser.add_argument("--where", default="", help="SOQL WHERE clause (without WHERE)")
    parser.add_argument("--limit", type=int, default=0, help="Max records (0 = no limit)")
    parser.add_argument("--out", dest="out_path", required=True)
    args = parser.parse_args(argv)

    fields = [f.strip() for f in args.fields.split(",") if f.strip()]
    if not fields:
        raise ValueError("--fields must list at least one field")
    client = get_client()
    result = client.query_all(build_soql(args.object_name, fields, args.where, args.limit))
    count = write_csv(result.get("records", []), fields, args.out_path)
    print(json.dumps({"object": args.object_name, "records": count, "file": args.out_path}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
