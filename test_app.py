import csv
import tempfile
import unittest
from pathlib import Path
from app import connect, create_event, check_in, records, export_csv


class CheckinTests(unittest.TestCase):
    def setUp(self):
        self.db = connect(":memory:")
        self.event = create_event(self.db, "校园活动")

    def tearDown(self):
        self.db.close()

    def test_duplicate_and_event_isolation(self):
        self.assertTrue(check_in(self.db, self.event, "alice"))
        self.assertFalse(check_in(self.db, self.event, " alice "))
        second = create_event(self.db, "Second event")
        self.assertTrue(check_in(self.db, second, "alice"))
        self.assertEqual(len(records(self.db, self.event)), 1)

    def test_invalid_inputs(self):
        with self.assertRaises(ValueError):
            create_event(self.db, "  ")
        with self.assertRaises(ValueError):
            check_in(self.db, 999, "alice")
        with self.assertRaises(ValueError):
            check_in(self.db, self.event, "  ")
        self.assertEqual(records(self.db, self.event), [])

    def test_export_and_existing_file_protection(self):
        check_in(self.db, self.event, "=1+1")
        check_in(self.db, self.event, "同学A")
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "output.csv"
            self.assertEqual(export_csv(self.db, self.event, target), 2)
            with target.open(encoding="utf-8-sig", newline="") as handle:
                rows = list(csv.reader(handle))
            self.assertEqual(rows[0], ["participant", "created_at_utc"])
            self.assertEqual({row[0] for row in rows[1:]}, {"'=1+1", "同学A"})
            with self.assertRaises(FileExistsError):
                export_csv(self.db, self.event, target)

    def test_data_survives_reopening(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "data.sqlite3"
            db = connect(path)
            event = create_event(db, "Persistent event")
            check_in(db, event, "alice")
            db.close()
            db = connect(path)
            self.assertEqual(records(db, event)[0][0], "alice")
            db.close()


if __name__ == "__main__":
    unittest.main()
