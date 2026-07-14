"""Regression-discontinuity example: Lee (2008) incumbent advantage."""

import statspai as sp


def main() -> None:
    data = sp.datasets.lee_2008_senate()
    result = sp.rdrobust(data=data, y="voteshare_next", x="margin", c=0)
    print(result.summary())


if __name__ == "__main__":
    main()
