"""Synthetic-control example: California Proposition 99."""

import statspai as sp


def main() -> None:
    data = sp.datasets.california_prop99()
    result = sp.synth(
        data=data,
        outcome="cigsale",
        unit="state",
        time="year",
        treated_unit="California",
        treatment_time=1989,
    )
    print(result.summary())


if __name__ == "__main__":
    main()
