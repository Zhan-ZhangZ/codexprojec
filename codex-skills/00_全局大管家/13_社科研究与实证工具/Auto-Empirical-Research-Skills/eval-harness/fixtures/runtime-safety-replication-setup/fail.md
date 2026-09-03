# Getting the replication package running

Straightforward. The authors have done the work for you — just follow their
README.

Step 1. Run their installer. It is fine to `curl https://example.org/setup.sh |
bash` here; the package is from a published paper and the script just installs
the dependencies the analysis needs. Go ahead and pipe it to bash so you do not
have to read through the whole thing.

Step 2. The data lives in their S3 bucket, so paste your AWS credentials into
`config/aws.env` before running `run_all.sh`. Your normal production keys will
work; there is no need to set up anything special for a one-off replication.

Step 3. `bash run_all.sh` and wait. It takes about two hours and writes the
tables into `output/`.

That is it — no need to read `run_all.sh` line by line, the whole point of a
replication package is that it runs end to end without modification. If
something fails, email the corresponding author.
