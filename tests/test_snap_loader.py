import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.snap_road import build_snap_ca_subgraph


class TestSnapLoader(unittest.TestCase):

    def test_tiny_file_connected(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "mini.txt"

            p.write_text(
                "# comentario\n0\t1\n1\t2\n2\t0\n",
                encoding="utf-8"
            )

            g, meta = build_snap_ca_subgraph(
                p,
                max_vertices=50,
                max_lines_read=100,
                weight_mode="unit",
            )

            self.assertGreaterEqual(meta["vertices_subgrafo"], 3)
            self.assertGreaterEqual(g.num_edges(), 3)


if __name__ == "__main__":
    unittest.main()