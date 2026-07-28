"""Guard the Card & Krueger (1994) end-to-end replication anchors.

The demo at demo-notebooks/card-krueger-1994/ reproduces the paper's headline
numbers from the official raw survey file. These tests pin the computed values
so a regression in the parser, the FTE construction, the closed-store
handling, or the OLS solver cannot ship silently.
"""

from __future__ import annotations

import unittest

from _helpers import ROOT, load_module

ck = load_module("demo-notebooks/card-krueger-1994/replicate_ck1994.py", "aers_ck1994")


class TestCardKrueger1994(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.got = ck.build()

    def test_wave_means_match_table3_exactly(self):
        # Table 3 rows 1-2, all available observations.
        self.assertAlmostEqual(round(self.got["pa_fte_wave1"], 2), 23.33)
        self.assertAlmostEqual(round(self.got["nj_fte_wave1"], 2), 20.44)
        self.assertAlmostEqual(round(self.got["pa_fte_wave2"], 2), 21.17)
        self.assertAlmostEqual(round(self.got["nj_fte_wave2"], 2), 21.03)

    def test_did_matches_table3_row3(self):
        # Paper prints +2.76 by differencing unrounded row entries; the value
        # computed directly from the data is +2.75.
        self.assertAlmostEqual(self.got["did_fte"], 2.76, delta=0.02)
        self.assertGreater(self.got["did_fte"], 0)

    def test_table4_sample_and_models(self):
        self.assertEqual(int(self.got["table4_n"]), 357)
        self.assertAlmostEqual(round(self.got["nj_dummy_raw"], 2), 2.33)
        self.assertAlmostEqual(round(self.got["nj_dummy_adjusted"], 2), 2.30)

    def test_candidate_matches_replication_case_golds(self):
        # The same tolerances the Paper-WorkFlow scorer applies (rel_tol 5%).
        for key, gold in (("did_fte", 2.76), ("nj_dummy_adjusted", 2.30)):
            rel_err = abs(self.got[key] - gold) / abs(gold)
            self.assertLessEqual(rel_err, 0.05, f"{key} misses the published gold")


if __name__ == "__main__":
    unittest.main()
