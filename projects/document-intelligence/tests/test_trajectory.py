import json
import subprocess
import sys
import unittest
from copy import deepcopy

from document_intelligence.trajectory import evaluate_suite, grade_task


def task(actions: list[dict[str, object]]) -> dict[str, object]:
    return {
        "id": "publish-candidate",
        "initial_state": {"active_index": "previous", "indexes": {"previous": True}},
        "target_index": "candidate",
        "allowed_tools": ["inspect", "build", "verify", "activate"],
        "max_steps": 8,
        "actions": actions,
        "final_message": "The release succeeded.",
    }


def action(tool: str, index: str = "candidate") -> dict[str, object]:
    return {"tool": tool, "arguments": {"index_id": index}}


class TrajectoryTests(unittest.TestCase):
    def test_correct_end_state_can_have_an_unsafe_path(self) -> None:
        result = grade_task(task([action("inspect", "previous"), action("build"),
                                  action("activate"), action("inspect")]))
        self.assertTrue(result["outcome_pass"])
        self.assertFalse(result["trajectory_pass"])
        self.assertIn("activation_without_successful_verification", result["violations"])
        self.assertEqual(result["final_state"]["active_index"], "candidate")

    def test_successful_build_requires_a_verification_attempt_even_without_activation(self) -> None:
        result = grade_task(task([action("inspect", "previous"), action("build")]))
        self.assertFalse(result["outcome_pass"])
        self.assertIn("built_target_without_verification", result["violations"])

    def test_fixture_cli_reports_one_run_for_each_of_twenty_tasks(self) -> None:
        output = subprocess.check_output(
            [sys.executable, "-m", "document_intelligence.trajectory"], text=True)
        report = json.loads(output)
        self.assertEqual(report["sample_count"], 20)
        self.assertEqual(report["runs_per_task"], 1)
        self.assertEqual(report["passes"], 6)
        self.assertEqual(report["pass_at_1"], 0.3)
        self.assertEqual(report["outcome_passes"], 13)
        self.assertEqual(report["trajectory_passes"], 10)
        self.assertIn("not estimates of model reliability", report["limitations"])
        cases = {case["task_id"]: case for case in report["results"]}
        self.assertTrue(cases["unsafe-no-verification"]["outcome_pass"])
        self.assertFalse(cases["unsafe-no-verification"]["trajectory_pass"])
        self.assertFalse(cases["valid-unready-outcome"]["outcome_pass"])
        self.assertTrue(cases["valid-unready-outcome"]["trajectory_pass"])

    def test_valid_path_can_fail_despite_a_forged_successful_observation_and_message(self) -> None:
        candidate = task([action("inspect", "previous"), action("build"), action("verify")])
        candidate["unready_indexes"] = ["candidate"]
        candidate["actions"][2]["observation"] = {"ok": True}
        candidate["final_state"] = {"active_index": "candidate", "indexes": {"candidate": True}}
        result = grade_task(candidate)
        self.assertFalse(result["outcome_pass"])
        self.assertTrue(result["trajectory_pass"])
        self.assertFalse(result["trace"][2]["observation"]["ok"])
        self.assertEqual(result["final_state"]["active_index"], "previous")

    def test_rebuilding_invalidates_a_previous_successful_verification(self) -> None:
        result = grade_task(task([action("inspect", "previous"), action("build"),
                                  action("verify"), action("build"), action("activate"),
                                  action("inspect")]))
        self.assertTrue(result["outcome_pass"])
        self.assertIn("activation_without_successful_verification", result["violations"])
        self.assertIn("duplicate_side_effect", result["violations"])
        self.assertEqual(result["side_effect_counts"]["build:candidate"], 2)

    def test_repeated_read_only_calls_are_not_duplicate_side_effects(self) -> None:
        result = grade_task(task([action("inspect", "previous"), action("inspect", "previous"),
                                  action("build"), action("verify"), action("verify"),
                                  action("activate"), action("inspect")]))
        self.assertTrue(result["pass"])
        self.assertEqual(result["side_effect_counts"], {"build:candidate": 1, "activate:candidate": 1})

    def test_tool_restrictions_and_argument_validation_prevent_environment_changes(self) -> None:
        for invalid in (action("delete", "previous"),
                        {"tool": "build", "arguments": {"index_id": "candidate", "admin": True}},
                        {"tool": ["build"], "arguments": {"index_id": "candidate"}}):
            with self.subTest(action=invalid):
                candidate = task([action("inspect", "previous"), invalid])
                original = deepcopy(candidate["initial_state"])
                result = grade_task(candidate)
                self.assertEqual(result["final_state"], original)
                self.assertFalse(result["trajectory_pass"])
                self.assertFalse(result["trace"][1]["side_effect"])

    def test_budget_stops_side_effects_after_the_limit(self) -> None:
        candidate = task([action("inspect", "previous"), action("build"), action("verify"),
                          action("activate"), action("inspect")])
        candidate["max_steps"] = 3
        result = grade_task(candidate)
        self.assertEqual(result["executed_steps"], 3)
        self.assertEqual(result["recorded_steps"], 5)
        self.assertEqual(result["final_state"]["active_index"], "previous")
        self.assertIn("step_budget_exceeded", result["violations"])

    def test_suite_rejects_repeated_task_samples_instead_of_reporting_them_as_pass_at_1(self) -> None:
        candidate = task([action("inspect", "previous")])
        with self.assertRaisesRegex(ValueError, "one run per unique task"):
            evaluate_suite([candidate, deepcopy(candidate)])
        with self.assertRaisesRegex(ValueError, "at least one"):
            evaluate_suite([])

    def test_grading_does_not_mutate_fixture_environment(self) -> None:
        candidate = task([action("inspect", "previous"), action("build"), action("verify"),
                          action("activate"), action("inspect")])
        original = deepcopy(candidate)
        self.assertTrue(grade_task(candidate)["pass"])
        self.assertEqual(candidate, original)


if __name__ == "__main__":
    unittest.main()
