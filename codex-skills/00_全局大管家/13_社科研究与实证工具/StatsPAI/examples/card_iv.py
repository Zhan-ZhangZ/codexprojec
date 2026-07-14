"""Instrumental-variables example: Card (1995) returns to schooling."""

import statspai as sp


def main() -> None:
    data = sp.datasets.card_1995()
    result = sp.ivreg(
        "lwage ~ (educ ~ nearc4) + exper + expersq + black + south + smsa",
        data=data,
    )
    print(result.summary())


if __name__ == "__main__":
    main()
