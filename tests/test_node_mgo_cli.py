import contextlib
import io
import tempfile
import unittest
from pathlib import Path

from node_mgo.cli import main


class NodeMgoCliTests(unittest.TestCase):
    def test_help_is_available(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main(["--help"]), 0)
        self.assertIn("Node.mgo", output.getvalue())

    def test_version_is_available(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main(["--version"]), 0)
        self.assertIn("Node.mgo", output.getvalue())

    def test_runs_memingo_source(self):
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "hello.mgo"
            source.write_text('vibe name = "Node.mgo"\nspill "Hello " + name', encoding="utf-8")
            with contextlib.redirect_stdout(output):
                self.assertEqual(main([str(source)]), 0)
        self.assertEqual(output.getvalue().strip(), "Hello Node.mgo")

    def test_javascript_is_not_silently_delegated(self):
        errors = io.StringIO()
        with contextlib.redirect_stderr(errors):
            self.assertEqual(main(["example.js"]), 2)
        self.assertIn("not implemented yet", errors.getvalue())
        self.assertIn("not passed to Node.js", errors.getvalue())

    def test_memingo_command_delegates_to_original_cli(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main(["memingo", "--version"]), 0)
        self.assertIn("Memingo 0.2.0", output.getvalue())


if __name__ == "__main__":
    unittest.main()
