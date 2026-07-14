"""Regression tests for synth result diagnostics."""

import statspai as sp


def test_diagnose_result_on_synth_counts_donors():
    syn = sp.dgp_synth(
        n_units=15, n_periods=25, treated_unit=0, treatment_time=18, seed=1
    )
    sr = sp.synth(
        syn,
        outcome="y",
        unit="unit",
        time="time",
        treated_unit=0,
        treatment_time=18,
    )
    # Previously raised TypeError because synth weights are a DataFrame.
    report = sp.diagnose_result(sr)
    assert report is not None
