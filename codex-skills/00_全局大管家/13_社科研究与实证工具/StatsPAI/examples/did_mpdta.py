"""Staggered DID example: Callaway-Santanna ATT on the mpdta dataset."""

import statspai as sp


def main() -> None:
    data = sp.datasets.mpdta()
    gt_result = sp.callaway_santanna(
        data=data,
        y="lemp",
        t="year",
        i="countyreal",
        g="first_treat",
    )
    # Use the analytic SE path for a fast reviewer smoke test. For the full
    # multiplier bootstrap used in the README, set bstrap=True.
    overall = sp.aggte(gt_result, type="simple", bstrap=False)
    print(overall.summary())


if __name__ == "__main__":
    main()
