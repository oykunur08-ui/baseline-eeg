"""
api/routes/experiments.py
Run evaluation experiments via API and return results for frontend charts.
"""

from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from evaluation.stability import run_stability_experiment
from evaluation.classification import run_classification_experiment
from evaluation.calibration import run_calibration_experiment
from evaluation.failure import run_failure_analysis

router = APIRouter()


@router.get("/stability")
def stability(
    n_subjects: int = Query(default=8, ge=2, le=20),
    n_sessions: int = Query(default=30, ge=10, le=60),
    seed: int = Query(default=42),
):
    results = run_stability_experiment(
        n_subjects=n_subjects, n_sessions=n_sessions, seed=seed
    )
    return results


@router.get("/classification")
def classification(
    n_subjects: int = Query(default=10, ge=4, le=20),
    n_sessions: int = Query(default=40, ge=15, le=80),
    seed: int = Query(default=42),
):
    results = run_classification_experiment(
        n_subjects=n_subjects, n_sessions=n_sessions, seed=seed
    )
    return results


@router.get("/calibration")
def calibration(
    n_subjects: int = Query(default=8, ge=4, le=20),
    n_sessions: int = Query(default=50, ge=20, le=100),
    seed: int = Query(default=42),
):
    results = run_calibration_experiment(
        n_subjects=n_subjects, n_sessions=n_sessions, seed=seed
    )
    return results


@router.get("/failure")
def failure_analysis(
    n_subjects: int = Query(default=6, ge=2, le=15),
    seed: int = Query(default=42),
):
    results = run_failure_analysis(n_subjects=n_subjects, seed=seed)
    return results


@router.get("/all")
def run_all(seed: int = Query(default=42)):
    return {
        "stability":      run_stability_experiment(seed=seed),
        "classification": run_classification_experiment(seed=seed),
        "calibration":    run_calibration_experiment(seed=seed),
        "failure":        run_failure_analysis(seed=seed),
    }
