# Effect of NSW Job Training on 1978 Earnings

## 1. Introduction

This note replicates the LaLonde NSW training evaluation to demonstrate the
manuscript-assembly stage of the Paper-WorkFlow pipeline. The substantive question
is whether participation in the National Supported Work demonstration raised
earnings in 1978, and how sensitive the answer is to the control set.

## 2. Results

Column (1) of Table 2 regresses 1978 earnings on the training indicator with no
controls and recovers a negative point estimate, which is the well-known
consequence of comparing the treated sample to an observational comparison group
that differs sharply in pre-treatment characteristics. Adding the full control set
in column (2) reverses the sign: training is associated with 1548.244 dollars of
additional 1978 earnings, significant at the 5 percent level. The estimation
sample contains 614 observations throughout, so the movement between columns is
driven entirely by the conditioning set rather than by a change in sample.

{{ include: table2_main }}

The instrumental-variables specification in column (3) is reported for
completeness rather than as a preferred estimate: its first-stage F statistic of
14.21 sits close to conventional weak-instrument thresholds and the Hansen J
p-value of 0.029 rejects the overidentifying restrictions, so the column is not
evidence for a causal claim and is not read as one here.

![Figure 1. Coefficient estimates across specifications](fig3_coefplot.png)

Figure 1 plots the treatment coefficient across specifications and makes the
sensitivity visible directly: the estimate is not stable enough across control
sets for this design to support an unqualified causal reading, which is the honest
conclusion the exhibits actually license.

## 3. Conclusion

The exercise reproduces the standard LaLonde teaching result and, more to the
point here, produces a single Word file that contains the prose, the table, the
figure and the reference list together, with every printed number traceable to a
committed analysis artifact.
