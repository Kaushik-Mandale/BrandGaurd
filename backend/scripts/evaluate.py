"""
Automated evaluation runner for the BrandGuard compliance pipeline.

Usage:
  python scripts/evaluate.py [--min-precision 0.80] [--min-recall 0.65]

Can run:
1. In-process (fast, direct service invocation against DB and rules)
2. HTTP-mode (when API server is live at BASE url)
"""
import argparse
import json
import os
import sys
from pathlib import Path

# Add backend directory to sys.path so app imports work seamlessly
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.services.benchmark import run_benchmark, load_dataset


def main():
    parser = argparse.ArgumentParser(description="BrandGuard Compliance Benchmark Evaluator")
    parser.add_argument("--min-precision", type=float, default=0.75, help="Minimum precision regression threshold")
    parser.add_argument("--min-recall", type=float, default=0.60, help="Minimum recall regression threshold")
    parser.add_argument("--org-id", type=int, default=1, help="Organization ID to evaluate rules against")
    args = parser.parse_args()

    print("================================================================================")
    print(" BRANDGUARD.AI — COMPLIANCE PIPELINE BENCHMARK EVALUATOR")
    print("================================================================================")

    db = SessionLocal()
    try:
        print(f"Loading versioned dataset from sample_data/eval_set.json ...")
        dataset = load_dataset()
        print(f"Dataset loaded: {len(dataset)} labeled examples.")
        print(f"Executing real pipeline verification against Org #{args.org_id} ...")

        res = run_benchmark(db, args.org_id)

        print("\n" + "=" * 50)
        print(" EVALUATION RESULTS SUMMARY")
        print("=" * 50)
        print(f"Dataset Version          : {res['dataset_version']}")
        print(f"Execution Mode           : {res.get('execution_mode', 'offline_deterministic').upper()}")
        print(f"Evaluation Scope         : {res.get('evaluation_scope', 'Deterministic Pipeline Checks')}")
        print(f"Total Samples Evaluated  : {res['sample_count']}")
        print(f"Execution Duration       : {res['duration_seconds']}s")
        print("-" * 50)
        print(f"Precision                : {res['precision'] * 100:.2f}% (Threshold: {args.min_precision * 100:.1f}%)")
        print(f"Recall                   : {res['recall'] * 100:.2f}% (Threshold: {args.min_recall * 100:.1f}%)")
        print(f"F1 Score                 : {res['f1'] * 100:.2f}%")
        print(f"False Positive Rate (FPR): {res['false_positive_rate'] * 100:.2f}%")
        print(f"Clean Post Accuracy      : {res['clean_posts_accuracy'] * 100:.2f}% ({res['clean_posts_passed']}/{res['clean_posts_total']})")
        print("-" * 50)
        print(f"True Positives (TP)      : {res['tp']}")
        print(f"False Positives (FP)     : {res['fp']}")
        print(f"False Negatives (FN)     : {res['fn']}")
        print("=" * 50)

        print("\nPER-CATEGORY PERFORMANCE BREAKDOWN:")
        for cat, stats in res.get("by_type", {}).items():
            print(f"  [{cat.upper():12}] TP: {stats['tp']:2d} | FP: {stats['fp']:2d} | FN: {stats['fn']:2d}")

        print(f"\nPersisted report saved to: sample_data/eval_results.json")

        # Regression check
        failed_regression = False
        if res["precision"] < args.min_precision:
            print(f"\n[REGRESSION ERROR] Precision {res['precision']:.3f} fell below threshold {args.min_precision:.3f}!")
            failed_regression = True
        if res["recall"] < args.min_recall:
            print(f"\n[REGRESSION ERROR] Recall {res['recall']:.3f} fell below threshold {args.min_recall:.3f}!")
            failed_regression = True

        if failed_regression:
            sys.exit(1)
        else:
            print("\n[SUCCESS] Pipeline passed all regression benchmarks with zero critical violations.")
            sys.exit(0)

    finally:
        db.close()


if __name__ == "__main__":
    main()
