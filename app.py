"""Campus Check-in: an AI-assisted local learning prototype."""
import argparse
import csv
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def connect(path):
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY, title TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS attendance (
            event_id INTEGER NOT NULL REFERENCES events(id),
            participant TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(event_id, participant)
        );
    """)
    return db


def clean(value):
    value = value.strip()
    if not value or len(value) > 100:
        raise ValueError("Text must contain 1 to 100 characters.")
    return value


def create_event(db, title):
    with db:
        cursor = db.execute("INSERT INTO events(title) VALUES (?)", (clean(title),))
    return cursor.lastrowid


def require_event(db, event_id):
    row = db.execute("SELECT title FROM events WHERE id = ?", (event_id,)).fetchone()
    if row is None:
        raise ValueError("Event not found. Run: python app.py events")
    return row[0]


def check_in(db, event_id, participant):
    require_event(db, event_id)
    participant = clean(participant)
    with db:
        cursor = db.execute(
            "INSERT INTO attendance VALUES (?, ?, ?) "
            "ON CONFLICT(event_id, participant) DO NOTHING",
            (event_id, participant, datetime.now(timezone.utc).isoformat(timespec="seconds")),
        )
    return cursor.rowcount == 1


def records(db, event_id):
    require_event(db, event_id)
    return db.execute(
        "SELECT participant, created_at FROM attendance WHERE event_id = ? "
        "ORDER BY created_at, participant", (event_id,)
    ).fetchall()


def csv_cell(text):
    # Prevent participant input from becoming a spreadsheet formula.
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text


def export_csv(db, event_id, target):
    rows = records(db, event_id)
    # Exclusive creation avoids replacing a user's existing file.
    with Path(target).open("x", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["participant", "created_at_utc"])
        writer.writerows((csv_cell(name), date) for name, date in rows)
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default="attendance.sqlite3")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create", help="Create an event")
    create.add_argument("title")
    commands.add_parser("events", help="List events")
    checkin = commands.add_parser("checkin", help="Check in a participant alias")
    checkin.add_argument("event_id", type=int)
    checkin.add_argument("participant")
    listing = commands.add_parser("records", help="List an event's check-ins")
    listing.add_argument("event_id", type=int)
    export = commands.add_parser("export", help="Export check-ins as CSV")
    export.add_argument("event_id", type=int)
    export.add_argument("file")
    args = parser.parse_args()
    db = None
    try:
        db = connect(args.db)
        if args.command == "create":
            print(f"Created event #{create_event(db, args.title)}")
        elif args.command == "events":
            for event_id, title in db.execute("SELECT id, title FROM events ORDER BY id"):
                print(f"{event_id}: {title}")
        elif args.command == "checkin":
            print("Checked in." if check_in(db, args.event_id, args.participant)
                  else "Already checked in; no duplicate record added.")
        elif args.command == "records":
            rows = records(db, args.event_id)
            for participant, date in rows:
                print(f"{participant} | {date}")
            print(f"Total: {len(rows)}")
        elif args.command == "export":
            print(f"Exported {export_csv(db, args.event_id, args.file)} records.")
    except (ValueError, sqlite3.Error, OSError) as error:
        parser.exit(1, f"Error: {error}\n")
    finally:
        if db is not None:
            db.close()


if __name__ == "__main__":
    main()
