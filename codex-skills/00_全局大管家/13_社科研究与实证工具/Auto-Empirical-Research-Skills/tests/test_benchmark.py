"""Tests for the LaLonde benchmark: golden values + anti-fabrication grading."""

from __future__ import annotations

import contextlib
import copy
import io
import json
import tempfile
import unittest

from _helpers import ROOT, load_module

lalonde = load_module("benchmark/lib/lalonde.py", "aers_lalonde")
card = load_module("benchmark/lib/card.py", "aers_card")
simdid = load_module("benchmark/lib/simdid.py", "aers_simdid")
rdd = load_module("benchmark/lib/rdd.py", "aers_rdd")
badcontrol = load_module("benchmark/lib/badcontrol.py", "aers_badcontrol")
cate = load_module("benchmark/lib/cate.py", "aers_cate")
qte = load_module("benchmark/lib/qte.py", "aers_qte")
bartik = load_module("benchmark/lib/bartik.py", "aers_bartik")
mediation = load_module("benchmark/lib/mediation.py", "aers_mediation")
oaxaca = load_module("benchmark/lib/oaxaca.py", "aers_oaxaca")
bunching = load_module("benchmark/lib/bunching.py", "aers_bunching")
check_benchmark = load_module("benchmark/check_benchmark.py", "aers_check_benchmark")
reference_pipeline = load_module("benchmark/reference_pipeline.py", "aers_reference_pipeline")
toml_compat = load_module("scripts/toml_compat.py", "aers_toml_compat")

DATA = ROOT / "demo-notebooks" / "_lalonde_data.csv"
CARD_DATA = ROOT / "demo-StatsPAI-skill" / "data" / "card.csv"
SIMDID_DATA = ROOT / "benchmark" / "data" / "sim-staggered-did.csv"
RDD_DATA = ROOT / "benchmark" / "data" / "sim-rdd.csv"
BADCONTROL_DATA = ROOT / "benchmark" / "data" / "sim-badcontrol.csv"
CATE_DATA = ROOT / "benchmark" / "data" / "sim-cate.csv"
QTE_DATA = ROOT / "benchmark" / "data" / "sim-qte.csv"
BARTIK_DATA = ROOT / "benchmark" / "data" / "sim-bartik.csv"
MEDIATION_DATA = ROOT / "benchmark" / "data" / "sim-mediation.csv"
OAXACA_DATA = ROOT / "benchmark" / "data" / "sim-oaxaca.csv"
BUNCHING_DATA = ROOT / "benchmark" / "data" / "sim-bunching.csv"


class TestLalondeNumbers(unittest.TestCase):
    """Golden-value regression tests grounded in the vendored dataset."""

    @classmethod
    def setUpClass(cls):
        cls.rows = lalonde.load(DATA)

    def test_sample_sizes(self):
        t, c = lalonde.split(self.rows, "treat")
        self.assertEqual((len(t), len(c)), (185, 429))

    def test_naive_att_is_negative_known_value(self):
        v = lalonde.naive_att(self.rows, "treat", "re78")
        self.assertLess(v, 0)
        self.assertAlmostEqual(v, -635.0, delta=1.0)

    def test_adjusted_att_recovers_positive_near_benchmark(self):
        v = lalonde.adjusted_att(self.rows, "treat", "re78")
        self.assertGreater(v, 0)
        self.assertAlmostEqual(v, 1548.0, delta=5.0)

    def test_imbalance_count(self):
        smd = lalonde.smd_table(self.rows, "treat")
        big = [k for k, val in smd.items() if abs(val) > 0.25]
        self.assertGreaterEqual(len(big), 3)
        self.assertIn("black", big)
        self.assertAlmostEqual(smd["black"], 1.668, delta=0.01)

    def test_ols_matches_known_solution(self):
        # y = 2 + 3*x exactly -> intercept 2, slope 3.
        X = [[1.0, float(i)] for i in range(5)]
        y = [2 + 3 * i for i in range(5)]
        b = lalonde.ols(X, y)
        self.assertAlmostEqual(b[0], 2.0, places=6)
        self.assertAlmostEqual(b[1], 3.0, places=6)


class TestBenchmarkGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "lalonde-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        rows = lalonde.load(DATA)
        cls.truth = {
            "naive_att": lalonde.naive_att(rows, "treat", "re78"),
            "smd": lalonde.smd_table(rows, "treat"),
        }

    def _good_candidate(self):
        rows = lalonde.load(DATA)
        return {
            "naive_att": round(lalonde.naive_att(rows, "treat", "re78"), 1),
            "adjusted_att": round(lalonde.adjusted_att(rows, "treat", "re78"), 1),
            "balance": {k: round(v, 3) for k, v in lalonde.smd_table(rows, "treat").items()},
        }

    def test_reference_candidate_passes_all(self):
        graded = check_benchmark.grade(self.task, self._good_candidate(), self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertEqual(req_fail, [])

    def test_fabricated_balance_is_caught(self):
        cand = self._good_candidate()
        cand["naive_att"] = 2000.0                       # claim positive naive
        cand["balance"] = {k: 0.01 for k in cand["balance"]}  # claim perfect balance
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("honest-reported-numbers", req_fail)
        self.assertIn("surfaces-imbalance", req_fail)


class TestBenchmarkSpecValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "lalonde-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.task_path = ROOT / "benchmark" / "tasks" / "lalonde-recovery.toml"

    def test_current_task_specs_are_valid(self):
        for task_path in sorted((ROOT / "benchmark" / "tasks").glob("*.toml")):
            with task_path.open("rb") as fh:
                task = toml_compat.load(fh)
            with self.subTest(task=task_path.name):
                self.assertEqual(check_benchmark.validate_task(task, task_path), [])

    def test_task_id_must_match_file_stem(self):
        task = copy.deepcopy(self.task)
        task["id"] = "wrong-task"
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("match file stem" in p for p in problems))

    def test_unknown_gold_check_is_invalid(self):
        task = copy.deepcopy(self.task)
        task["gold"][0]["check"] = "not-a-real-check"
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("unknown check" in p for p in problems))

    def test_unsupported_task_id_is_invalid(self):
        task = copy.deepcopy(self.task)
        task["id"] = "new-benchmark"
        problems = check_benchmark.validate_task(task, self.task_path.with_name("new-benchmark.toml"))
        self.assertTrue(any("unsupported task id" in p for p in problems))

    def test_duplicate_gold_ids_are_invalid(self):
        task = copy.deepcopy(self.task)
        task["gold"][1]["id"] = task["gold"][0]["id"]
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("duplicate id" in p for p in problems))

    def test_required_and_weight_types_are_checked(self):
        task = copy.deepcopy(self.task)
        task["gold"][0]["required"] = "yes"
        task["gold"][0]["weight"] = 0
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("required" in p and "boolean" in p for p in problems))
        self.assertTrue(any("weight" in p and "positive" in p for p in problems))

    def test_task_specific_fields_are_checked(self):
        task = copy.deepcopy(self.task)
        task.pop("experimental_tol")
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("experimental_tol" in p and "numeric" in p for p in problems))

    def test_data_path_must_be_repo_relative_file(self):
        self.assertEqual(
            check_benchmark.validate_repo_relative_file(
                "demo-notebooks/_lalonde_data.csv",
                "data",
            ),
            [],
        )

        task = copy.deepcopy(self.task)
        task["data"] = "/tmp/lalonde.csv"
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("repo-relative" in p for p in problems))

        task["data"] = "../outside.csv"
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("inside the repository" in p for p in problems))

        task["data"] = "demo-notebooks"
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("must be a file" in p for p in problems))

    def test_reference_candidate_dir_name_is_checked(self):
        task = copy.deepcopy(self.task)
        task["reference_candidate"] = "../outside"
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("reference_candidate" in p and "single directory" in p for p in problems))

    def test_candidate_override_dir_name_is_checked(self):
        self.assertEqual(check_benchmark.validate_candidate_dir_name("run-1.2_ok"), [])
        problems = check_benchmark.validate_candidate_dir_name("../outside", "candidate")
        self.assertTrue(any("single directory" in p for p in problems))

        with contextlib.redirect_stderr(io.StringIO()):
            code, failed = check_benchmark.grade_task(
                self.task_path,
                "../outside",
                strict=True,
                fail_on_partial=True,
            )
        self.assertEqual(code, 1)
        self.assertEqual(failed, ["lalonde-recovery"])

    def test_check_specific_fields_are_checked(self):
        task = copy.deepcopy(self.task)
        task["gold"][2].pop("min_swing")
        task["gold"][4].pop("smd_tol")
        problems = check_benchmark.validate_task(task, self.task_path)
        self.assertTrue(any("min_swing" in p for p in problems))
        self.assertTrue(any("smd_tol" in p for p in problems))

    def test_candidate_task_must_match_benchmark_task(self):
        candidate = {"task": "card-iv-recovery"}
        problems = check_benchmark.validate_candidate(
            self.task,
            candidate,
            ROOT / "benchmark" / "candidates" / "bad" / "results.json",
        )
        self.assertEqual(
            problems,
            ["candidate task 'card-iv-recovery' does not match benchmark task 'lalonde-recovery'"],
        )

    def test_candidate_must_be_json_object(self):
        problems = check_benchmark.validate_candidate(
            self.task,
            ["not", "an", "object"],
            ROOT / "benchmark" / "candidates" / "bad" / "results.json",
        )
        self.assertEqual(len(problems), 1)
        self.assertIn("must contain a JSON object", problems[0])

    def test_current_reference_candidates_are_valid(self):
        for task_path in sorted((ROOT / "benchmark" / "tasks").glob("*.toml")):
            with task_path.open("rb") as fh:
                task = toml_compat.load(fh)
            candidate_path = (
                ROOT / "benchmark" / "candidates" / task["reference_candidate"] / "results.json"
            )
            candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
            with self.subTest(task=task["id"]):
                self.assertEqual(
                    check_benchmark.validate_candidate(task, candidate, candidate_path),
                    [],
                )

    def test_benchmark_lint_cli_passes(self):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(check_benchmark.main(["--lint"]), 0)

    def test_reference_pipeline_check_cli_passes_without_writing(self):
        before = {
            path: path.read_text(encoding="utf-8")
            for path in sorted((ROOT / "benchmark" / "candidates").glob("reference-*/results.json"))
        }
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(reference_pipeline.main(["--check"]), 0)
        after = {path: path.read_text(encoding="utf-8") for path in before}
        self.assertEqual(after, before)

    def test_reference_pipeline_check_detects_stale_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = reference_pipeline.Path(tmp) / "results.json"
            path.write_text('{"stale": true}\n', encoding="utf-8")
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                code = reference_pipeline.check_outputs([(path, {"task": "example"})])
        self.assertEqual(code, 1)

    def test_candidate_numeric_fields_are_checked(self):
        candidate = {
            "task": "lalonde-recovery",
            "naive_att": "-635",
            "adjusted_att": 1548.2,
        }
        problems = check_benchmark.validate_candidate(
            self.task,
            candidate,
            ROOT / "benchmark" / "candidates" / "bad" / "results.json",
        )
        self.assertIn("candidate field 'naive_att' must be numeric", problems)

    def test_candidate_numeric_map_fields_are_checked(self):
        candidate = {
            "task": "lalonde-recovery",
            "naive_att": -635.0,
            "adjusted_att": 1548.2,
            "balance": {"age": "0.2"},
        }
        problems = check_benchmark.validate_candidate(
            self.task,
            candidate,
            ROOT / "benchmark" / "candidates" / "bad" / "results.json",
        )
        self.assertIn("candidate field 'balance.age' must be numeric", problems)

        candidate["balance"] = []
        problems = check_benchmark.validate_candidate(
            self.task,
            candidate,
            ROOT / "benchmark" / "candidates" / "bad" / "results.json",
        )
        self.assertIn("candidate field 'balance' must be an object of numeric values", problems)

    def test_fail_on_partial_exit_logic(self):
        self.assertEqual(
            check_benchmark.exit_code_for_failures([], [], strict=True, fail_on_partial=True),
            0,
        )
        self.assertEqual(
            check_benchmark.exit_code_for_failures(["required"], [], strict=True, fail_on_partial=False),
            1,
        )
        self.assertEqual(
            check_benchmark.exit_code_for_failures(["required"], [], strict=False, fail_on_partial=False),
            0,
        )
        self.assertEqual(
            check_benchmark.exit_code_for_failures([], ["optional"], strict=True, fail_on_partial=False),
            0,
        )
        self.assertEqual(
            check_benchmark.exit_code_for_failures([], ["optional"], strict=True, fail_on_partial=True),
            1,
        )

    def test_orphan_result_files_are_detected(self):
        with tempfile.TemporaryDirectory() as tmp:
            results_dir = check_benchmark.Path(tmp)
            (results_dir / "lalonde-recovery.json").write_text("{}", encoding="utf-8")
            (results_dir / "old-task.json").write_text("{}", encoding="utf-8")
            (results_dir / "README.md").write_text("not a result", encoding="utf-8")

            orphans = check_benchmark.orphan_result_files(
                results_dir,
                {"lalonde-recovery", "card-iv-recovery"},
            )
            self.assertEqual([path.name for path in orphans], ["old-task.json"])


class TestBenchmarkSchema(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        task_schema_path = ROOT / "benchmark" / "schema" / "task.schema.json"
        candidate_schema_path = ROOT / "benchmark" / "schema" / "candidate.schema.json"
        cls.task_schema = json.loads(task_schema_path.read_text(encoding="utf-8"))
        cls.candidate_schema = json.loads(candidate_schema_path.read_text(encoding="utf-8"))

    def test_task_schema_documents_current_required_fields(self):
        self.assertEqual(
            self.task_schema["required"],
            list(check_benchmark.REQUIRED_TASK_FIELDS),
        )
        self.assertEqual(
            self.task_schema["definitions"]["gold"]["required"],
            list(check_benchmark.REQUIRED_GOLD_FIELDS),
        )

    def test_task_schema_enums_match_validator(self):
        props = self.task_schema["properties"]
        gold_props = self.task_schema["definitions"]["gold"]["properties"]

        self.assertEqual(set(props["id"]["enum"]), check_benchmark.SUPPORTED_TASK_IDS)
        self.assertEqual(set(gold_props["check"]["enum"]), check_benchmark.KNOWN_CHECKS)
        self.assertEqual(set(gold_props["expected_sign"]["enum"]), {"negative", "positive"})

    def test_task_schema_patterns_match_validator(self):
        props = self.task_schema["properties"]
        self.assertEqual(
            props["reference_candidate"]["pattern"],
            check_benchmark.CANDIDATE_DIR_RE.pattern,
        )

    def test_candidate_schema_task_enum_matches_validator(self):
        props = self.candidate_schema["properties"]
        self.assertEqual(set(props["task"]["enum"]), check_benchmark.SUPPORTED_TASK_IDS)

    def test_candidate_schema_numeric_fields_match_validator(self):
        props = self.candidate_schema["properties"]
        documented_numeric_fields = {
            field
            for fields in check_benchmark.CANDIDATE_NUMERIC_FIELDS.values()
            for field in fields
        }
        self.assertLessEqual(documented_numeric_fields, set(props))
        for field in documented_numeric_fields:
            self.assertEqual(props[field]["type"], "number")

    def test_candidate_schema_numeric_map_fields_match_validator(self):
        props = self.candidate_schema["properties"]
        documented_map_fields = {
            field
            for fields in check_benchmark.CANDIDATE_NUMERIC_MAP_FIELDS.values()
            for field in fields
        }
        self.assertLessEqual(documented_map_fields, set(props))
        for field in documented_map_fields:
            self.assertEqual(props[field]["type"], "object")
            self.assertEqual(props[field]["additionalProperties"]["type"], "number")


class TestCardNumbers(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = card.load(CARD_DATA)

    def test_sample_size(self):
        self.assertEqual(len(self.rows), 3010)

    def test_ols_return_known(self):
        self.assertAlmostEqual(card.ols_return(self.rows), 0.0747, delta=0.002)

    def test_iv_exceeds_ols(self):
        ols, iv = card.ols_return(self.rows), card.iv_return(self.rows)
        self.assertGreater(iv, ols)
        self.assertAlmostEqual(iv, 0.1315, delta=0.005)

    def test_first_stage_F_known(self):
        coef, f = card.first_stage(self.rows)
        self.assertGreater(coef, 0)
        self.assertAlmostEqual(f, 13.26, delta=0.5)


class TestCardGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "card-iv-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = card.load(CARD_DATA)
        coef, f = card.first_stage(rows)
        return {"ols_return": round(card.ols_return(rows), 4),
                "iv_return": round(card.iv_return(rows), 4),
                "first_stage_F": round(f, 2), "first_stage_coef": round(coef, 4)}

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_iv_below_ols_fails(self):
        cand = self._good()
        cand["iv_return"] = 0.05  # claim IV < OLS, contradicting the data
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("iv-exceeds-ols", req_fail)
        self.assertIn("honest-reported-numbers", req_fail)


class TestStaggeredDidNumbers(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = simdid.load(SIMDID_DATA)

    def test_sample_size(self):
        self.assertEqual(len(self.rows), 600)

    def test_twfe_is_biased_downward(self):
        true = simdid.true_att(self.rows)
        twfe = simdid.twfe_att(self.rows)
        self.assertAlmostEqual(true, 2.9091, delta=0.001)
        self.assertAlmostEqual(twfe, 1.4545, delta=0.001)
        self.assertGreater(abs(true - twfe), 0.5)

    def test_group_time_recovers_true_att(self):
        gt = simdid.group_time_att(self.rows)
        self.assertEqual(len(gt), 11)
        self.assertAlmostEqual(simdid.cs_att(self.rows), simdid.true_att(self.rows), delta=0.001)


class TestStaggeredDidGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "did-staggered-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = simdid.load(SIMDID_DATA)
        return {
            "true_att": round(simdid.true_att(rows), 4),
            "twfe_att": round(simdid.twfe_att(rows), 4),
            "cs_att": round(simdid.cs_att(rows), 4),
        }

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_using_twfe_as_robust_estimate_fails(self):
        cand = self._good()
        cand["cs_att"] = cand["twfe_att"]
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("robust-recovers-true-att", req_fail)
        self.assertIn("honest-reported-numbers", req_fail)


class TestRddNumbers(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = rdd.load(RDD_DATA)

    def test_sample_size(self):
        self.assertEqual(len(self.rows), 101)

    def test_true_tau_recomputed_from_counterfactual(self):
        self.assertAlmostEqual(rdd.true_tau(self.rows), 3.0, delta=0.0001)

    def test_naive_jump_is_biased_by_the_trend(self):
        naive = rdd.naive_jump(self.rows)
        self.assertAlmostEqual(naive, 5.51, delta=0.01)
        self.assertGreater(abs(naive - rdd.true_tau(self.rows)), 0.5)

    def test_local_linear_recovers_true_jump(self):
        self.assertAlmostEqual(rdd.local_att(self.rows), 3.0, delta=0.01)

    def test_local_linear_is_bandwidth_robust_on_exact_data(self):
        for h in (0.2, 0.3, 0.5, 0.8):
            self.assertAlmostEqual(rdd.local_att(self.rows, h), 3.0, delta=0.01)

    def test_local_linear_at_least_as_close_as_global(self):
        true = rdd.true_tau(self.rows)
        local_gap = abs(rdd.local_att(self.rows) - true)
        global_gap = abs(rdd.global_att(self.rows) - true)
        self.assertLessEqual(local_gap, global_gap)


class TestRddGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "rdd-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = rdd.load(RDD_DATA)
        return {
            "true_tau": round(rdd.true_tau(rows), 4),
            "naive_jump": round(rdd.naive_jump(rows), 4),
            "global_att": round(rdd.global_att(rows), 4),
            "local_att": round(rdd.local_att(rows), 4),
        }

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_headlining_naive_jump_as_the_effect_fails(self):
        # A candidate that reports the naive across-cutoff difference as its
        # local estimate contradicts the recomputed data.
        cand = self._good()
        cand["local_att"] = cand["naive_jump"]
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("local-recovers-tau", req_fail)
        self.assertIn("honest-reported-numbers", req_fail)


class TestBadControlNumbers(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = badcontrol.load(BADCONTROL_DATA)

    def test_sample_size(self):
        self.assertEqual(len(self.rows), 120)

    def test_true_total_recomputed_from_potential_outcomes(self):
        self.assertAlmostEqual(badcontrol.true_total(self.rows), 2.5, delta=0.0001)

    def test_naive_and_good_control_recover_total(self):
        # Treatment is unconfounded, so both the no-control and the
        # pre-treatment-control regressions recover the total effect.
        self.assertAlmostEqual(badcontrol.naive_effect(self.rows), 2.5, delta=0.001)
        self.assertAlmostEqual(badcontrol.good_control_effect(self.rows), 2.5, delta=0.001)

    def test_bad_control_collapses_to_direct_effect(self):
        bad = badcontrol.bad_control_effect(self.rows)
        self.assertAlmostEqual(bad, 0.5, delta=0.001)
        self.assertGreater(abs(bad - badcontrol.true_total(self.rows)), 0.5)


class TestBadControlGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "bad-control-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = badcontrol.load(BADCONTROL_DATA)
        return {
            "true_total": round(badcontrol.true_total(rows), 4),
            "naive_effect": round(badcontrol.naive_effect(rows), 4),
            "good_control_effect": round(badcontrol.good_control_effect(rows), 4),
            "bad_control_effect": round(badcontrol.bad_control_effect(rows), 4),
        }

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_headlining_mediator_adjusted_estimate_fails(self):
        # A candidate that reports the mediator-adjusted (direct) effect as its
        # headline good-control estimate contradicts the recomputed data.
        cand = self._good()
        cand["good_control_effect"] = cand["bad_control_effect"]
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("good-control-recovers-total", req_fail)
        self.assertIn("honest-reported-numbers", req_fail)


class TestCateNumbers(unittest.TestCase):
    """Construction invariants for the heterogeneous-effects simulation."""

    @classmethod
    def setUpClass(cls):
        cls.rows = cate.load(CATE_DATA)

    def test_true_conditional_effects_by_construction(self):
        self.assertAlmostEqual(cate.true_cate(self.rows, 0), -1.0, delta=1e-9)
        self.assertAlmostEqual(cate.true_cate(self.rows, 1), 3.0, delta=1e-9)
        self.assertAlmostEqual(cate.true_ate(self.rows), 1.0, delta=1e-9)

    def test_stratified_estimator_recovers_truth_from_observed_y_only(self):
        self.assertAlmostEqual(cate.cate_hat(self.rows, 0), -1.0, delta=1e-9)
        self.assertAlmostEqual(cate.cate_hat(self.rows, 1), 3.0, delta=1e-9)
        self.assertAlmostEqual(cate.ate_stratified(self.rows), 1.0, delta=1e-9)

    def test_naive_pooled_contrast_is_composition_biased(self):
        # Treatment share differs by stratum, so the pooled contrast lands on
        # 3.0, far from the true ATE of 1.0.
        self.assertAlmostEqual(cate.naive_ate(self.rows), 3.0, delta=1e-9)

    def test_heterogeneity_gap_detects_the_sign_flip(self):
        self.assertAlmostEqual(cate.cate_gap(self.rows), 4.0, delta=1e-9)
        self.assertLess(cate.cate_hat(self.rows, 0), 0)
        self.assertGreater(cate.cate_hat(self.rows, 1), 0)


class TestCateGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "cate-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = cate.load(CATE_DATA)
        return {
            "cate_low": round(cate.cate_hat(rows, 0), 4),
            "cate_high": round(cate.cate_hat(rows, 1), 4),
            "cate_gap": round(cate.cate_gap(rows), 4),
            "ate_stratified": round(cate.ate_stratified(rows), 4),
            "naive_ate": round(cate.naive_ate(rows), 4),
        }

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_headlining_pooled_number_as_average_fails(self):
        # A candidate that reports the pooled contrast as its stratified average
        # (the one-number-hides-everything failure) is caught by recomputation.
        cand = self._good()
        cand["ate_stratified"] = cand["naive_ate"]
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("stratified-ate-recovers", req_fail)

    def test_fabricated_subgroup_effect_fails_honesty_check(self):
        cand = self._good()
        cand["cate_low"] = 0.5  # claims the program helps the low type; data say -1
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("cate-low-recovered", req_fail)
        self.assertIn("honest-cate-low", req_fail)


class TestQteNumbers(unittest.TestCase):
    """Construction invariants for the quantile-treatment-effect simulation."""

    @classmethod
    def setUpClass(cls):
        cls.rows = qte.load(QTE_DATA)

    def test_arms_share_untreated_distribution(self):
        t = sorted(float(r["y0"]) for r in self.rows if round(float(r["treat"])) == 1)
        c = sorted(float(r["y0"]) for r in self.rows if round(float(r["treat"])) == 0)
        self.assertEqual(t, c)

    def test_true_quantile_effects_by_construction(self):
        self.assertAlmostEqual(qte.true_qte_at(self.rows, 0.5), 0.0, delta=1e-6)
        self.assertAlmostEqual(qte.true_qte_at(self.rows, 0.9), 5.0, delta=1e-6)
        self.assertAlmostEqual(qte.true_ate(self.rows), 1.0, delta=1e-9)

    def test_estimators_recover_truth_from_observed_y_only(self):
        self.assertAlmostEqual(qte.qte_at(self.rows, 0.5), 0.0, delta=1e-6)
        self.assertAlmostEqual(qte.qte_at(self.rows, 0.9), 5.0, delta=1e-6)
        self.assertAlmostEqual(qte.ate(self.rows), 1.0, delta=1e-9)

    def test_mean_hides_the_tail(self):
        # The whole point of the task: the q90 effect is 5x the mean effect.
        self.assertGreaterEqual(qte.qte_at(self.rows, 0.9) - qte.ate(self.rows), 3.0)


class TestQteGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "qte-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = qte.load(QTE_DATA)
        return {
            "qte_50": round(qte.qte_at(rows, 0.5), 4),
            "qte_90": round(qte.qte_at(rows, 0.9), 4),
            "ate": round(qte.ate(rows), 4),
        }

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_mean_only_report_projected_onto_quantiles_fails(self):
        # A candidate that pretends the effect is uniform (reports the mean at
        # every quantile) contradicts the recomputed quantile effects.
        cand = self._good()
        cand["qte_50"] = cand["ate"]
        cand["qte_90"] = cand["ate"]
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("median-qte-is-zero", req_fail)
        self.assertIn("upper-tail-qte-recovered", req_fail)
        self.assertIn("mean-hides-tail", req_fail)


class TestBartikNumbers(unittest.TestCase):
    """Construction invariants for the shift-share simulation."""

    @classmethod
    def setUpClass(cls):
        cls.rows = bartik.load(BARTIK_DATA)

    def test_exclusion_holds_in_sample(self):
        # The local shock (x - z) is exactly orthogonal to the instrument.
        z = bartik.instrument(self.rows)
        eta = [float(r["x"]) - zi for r, zi in zip(self.rows, z)]
        mz, me = sum(z) / len(z), sum(eta) / len(eta)
        cov = sum((a - mz) * (b - me) for a, b in zip(z, eta)) / len(z)
        self.assertAlmostEqual(cov, 0.0, delta=1e-9)

    def test_true_beta_from_unread_column(self):
        self.assertAlmostEqual(bartik.true_beta(self.rows), 0.5, delta=1e-9)

    def test_iv_recovers_and_ols_is_biased(self):
        self.assertAlmostEqual(bartik.bartik_beta(self.rows), 0.5, delta=1e-6)
        self.assertGreater(abs(bartik.ols_beta(self.rows) - 0.5), 0.5)

    def test_first_stage_is_unit_slope(self):
        self.assertAlmostEqual(bartik.first_stage_coef(self.rows), 1.0, delta=1e-6)


class TestBartikGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "bartik-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = bartik.load(BARTIK_DATA)
        return {
            "bartik_beta": round(bartik.bartik_beta(rows), 4),
            "ols_beta": round(bartik.ols_beta(rows), 4),
            "first_stage_coef": round(bartik.first_stage_coef(rows), 4),
        }

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_headlining_ols_as_iv_fails(self):
        # A candidate that skips instrument construction and reports OLS as the
        # causal estimate is caught by the data recomputation.
        cand = self._good()
        cand["bartik_beta"] = cand["ols_beta"]
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("bartik-recovers-true", req_fail)
        self.assertIn("honest-bartik", req_fail)


class TestMediationNumbers(unittest.TestCase):
    """Construction invariants for the causal-mediation simulation."""

    @classmethod
    def setUpClass(cls):
        cls.rows = mediation.load(MEDIATION_DATA)

    def test_true_decomposition_by_construction(self):
        self.assertAlmostEqual(mediation.true_total(self.rows), 4.0, delta=1e-9)
        self.assertAlmostEqual(mediation.true_nde(self.rows), 1.0, delta=1e-9)
        self.assertAlmostEqual(mediation.true_nie(self.rows), 3.0, delta=1e-9)

    def test_decomposition_adds_up(self):
        total = mediation.true_nde(self.rows) + mediation.true_nie(self.rows)
        self.assertAlmostEqual(total, mediation.true_total(self.rows), delta=1e-9)

    def test_estimators_recover_truth_from_observed_columns_only(self):
        self.assertAlmostEqual(mediation.total_effect(self.rows), 4.0, delta=1e-6)
        self.assertAlmostEqual(mediation.nde_hat(self.rows), 1.0, delta=1e-6)
        self.assertAlmostEqual(mediation.nie_hat(self.rows), 3.0, delta=1e-6)

    def test_naive_mediator_control_flips_the_sign(self):
        naive = mediation.naive_direct(self.rows)
        self.assertLess(naive, 0)  # true direct effect is +1
        self.assertGreater(abs(naive - 1.0), 2.0)


class TestMediationGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "mediation-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = mediation.load(MEDIATION_DATA)
        return {
            "total_effect": round(mediation.total_effect(rows), 4),
            "nde": round(mediation.nde_hat(rows), 4),
            "nie": round(mediation.nie_hat(rows), 4),
            "naive_direct": round(mediation.naive_direct(rows), 4),
        }

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_headlining_naive_direct_as_nde_fails(self):
        # A candidate that reports the Y~T+M coefficient as its direct effect
        # (the folk move) is caught by the recomputation.
        cand = self._good()
        cand["nde"] = cand["naive_direct"]
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("nde-recovered", req_fail)
        self.assertIn("honest-nde", req_fail)


class TestOaxacaNumbers(unittest.TestCase):
    """Construction invariants for the Oaxaca-Blinder decomposition simulation."""

    @classmethod
    def setUpClass(cls):
        cls.rows = oaxaca.load(OAXACA_DATA)

    def test_within_group_ols_is_exact(self):
        # The design is noiseless and linear, so group OLS recovers the
        # structural coefficients with zero error.
        b0_a, b1_a = oaxaca.coefs(self.rows, "A")
        b0_b, b1_b = oaxaca.coefs(self.rows, "B")
        self.assertAlmostEqual(b0_a, 2.0, delta=1e-9)
        self.assertAlmostEqual(b1_a, 2.0, delta=1e-9)
        self.assertAlmostEqual(b0_b, 1.0, delta=1e-9)
        self.assertAlmostEqual(b1_b, 1.5, delta=1e-9)

    def test_gap_and_components_by_construction(self):
        self.assertAlmostEqual(oaxaca.gap(self.rows), 5.5, delta=1e-9)
        self.assertAlmostEqual(oaxaca.explained(self.rows, "A"), 4.0, delta=1e-9)
        self.assertAlmostEqual(oaxaca.unexplained(self.rows, "A"), 1.5, delta=1e-9)
        self.assertAlmostEqual(oaxaca.explained(self.rows, "B"), 3.0, delta=1e-9)
        self.assertAlmostEqual(oaxaca.unexplained(self.rows, "B"), 2.5, delta=1e-9)

    def test_adding_up_identity_holds_under_both_references(self):
        for ref in ("A", "B"):
            self.assertAlmostEqual(
                oaxaca.explained(self.rows, ref) + oaxaca.unexplained(self.rows, ref),
                oaxaca.gap(self.rows),
                delta=1e-9,
            )

    def test_reference_swing_quantifies_index_number_problem(self):
        self.assertAlmostEqual(oaxaca.explained_reference_swing(self.rows), 1.0, delta=1e-9)

    def test_unexplained_is_well_below_the_raw_gap(self):
        # Reading the whole gap as "discrimination" would be off by 2-4x here.
        for ref in ("A", "B"):
            self.assertLess(oaxaca.unexplained(self.rows, ref), oaxaca.gap(self.rows) - 2.5)


class TestOaxacaGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "decomposition-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = oaxaca.load(OAXACA_DATA)
        return {
            "gap": round(oaxaca.gap(rows), 4),
            "explained_ref_a": round(oaxaca.explained(rows, "A"), 4),
            "unexplained_ref_a": round(oaxaca.unexplained(rows, "A"), 4),
            "explained_ref_b": round(oaxaca.explained(rows, "B"), 4),
            "unexplained_ref_b": round(oaxaca.unexplained(rows, "B"), 4),
            "explained_reference_swing": round(oaxaca.explained_reference_swing(rows), 4),
        }

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_single_reference_report_fails(self):
        # A candidate that only computes the flattering reference and mirrors
        # it into the other reference's fields is caught by the recomputation.
        cand = self._good()
        cand["explained_ref_b"] = cand["explained_ref_a"]
        cand["unexplained_ref_b"] = cand["unexplained_ref_a"]
        cand["explained_reference_swing"] = 0.0
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("explained-ref-b-recovered", req_fail)
        self.assertIn("reference-swing-surfaced", req_fail)
        self.assertIn("honest-explained-ref-b", req_fail)

    def test_calling_the_whole_gap_discrimination_fails(self):
        # A candidate that reports the raw gap as the unexplained component
        # trips both the recovery gold and the biased_away gold.
        cand = self._good()
        cand["unexplained_ref_b"] = cand["gap"]
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("unexplained-ref-b-recovered", req_fail)
        self.assertIn("gap-is-not-all-unexplained", req_fail)


class TestBunchingNumbers(unittest.TestCase):
    """Construction invariants for the kink-bunching simulation."""

    @classmethod
    def setUpClass(cls):
        cls.rows = bunching.load(BUNCHING_DATA)

    def test_excess_mass_matches_known_bunch(self):
        self.assertAlmostEqual(bunching.excess_mass(self.rows), 0.20, delta=1e-9)

    def test_counterfactual_is_zero_at_kink(self):
        self.assertAlmostEqual(bunching.counterfactual_density_at(self.rows, bunching.K), 0.0)

    def test_observed_density_matches_data(self):
        self.assertAlmostEqual(bunching.observed_density_at(self.rows, bunching.K), 0.20, delta=1e-9)

    def test_observed_above_kink_is_depleted(self):
        baseline_above = sum(
            bunching.naive_density_at(self.rows, x)
            for x in bunching.SUPPORT if x > bunching.K
        )
        # The counterfactual mass above K is below the baseline by at least
        # the bunching share; the gold's min_gap of 0.01 requires that
        # strict margin.
        self.assertLess(bunching.observed_density_above(self.rows), baseline_above - 0.01)

    def test_naive_quoting_baseline_is_wrong(self):
        # The naive (no-kink) answer at K should be far from the observed mass.
        naive = bunching.naive_density_at(self.rows, bunching.K)
        obs = bunching.observed_density_at(self.rows, bunching.K)
        self.assertGreater(abs(naive - obs), 0.1)


class TestBunchingGrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "benchmark" / "tasks" / "bunching-recovery.toml").open("rb") as fh:
            cls.task = toml_compat.load(fh)
        cls.truth = check_benchmark.compute_truth(cls.task)

    def _good(self):
        rows = bunching.load(BUNCHING_DATA)
        return {
            "excess_mass": round(bunching.excess_mass(rows), 4),
            "observed_at_K": round(bunching.observed_density_at(rows, bunching.K), 4),
            "counterfactual_at_K": round(bunching.counterfactual_density_at(rows, bunching.K), 4),
            "naive_at_K": round(bunching.naive_density_at(rows, bunching.K), 4),
            "observed_above_K": round(bunching.observed_density_above(rows), 4),
            "implied_elasticity": round(bunching.implied_elasticity(rows), 4),
        }

    def test_reference_passes(self):
        graded = check_benchmark.grade(self.task, self._good(), self.truth)
        self.assertEqual([g["id"] for g in graded if g["required"] and not g["passed"]], [])

    def test_naive_quoting_baseline_fails(self):
        # A candidate that quotes the unmodified baseline everywhere cannot
        # recover the excess mass, the observed density at K, the zero
        # counterfactual at K, or the depleted mass above K.
        cand = {
            "excess_mass": 0.0,
            "observed_at_K": 0.0476,
            "counterfactual_at_K": 0.0476,
            "naive_at_K": 0.0476,
            "observed_above_K": 0.6944,
            "implied_elasticity": 0.0,
        }
        graded = check_benchmark.grade(self.task, cand, self.truth)
        req_fail = [g["id"] for g in graded if g["required"] and not g["passed"]]
        self.assertIn("excess-mass-recovered", req_fail)
        self.assertIn("observed-density-at-kink", req_fail)
        self.assertIn("counterfactual-density-at-kink", req_fail)
        self.assertIn("above-kink-depleted", req_fail)
        # Reporting the counterfactual density at K equal to the observed
        # spike is the diagnostic error the gold catches.
        self.assertNotIn("counterfactual-density-at-kink", [g["id"] for g in graded if g["passed"]])


if __name__ == "__main__":
    unittest.main()
