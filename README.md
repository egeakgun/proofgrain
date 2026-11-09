# Proofgrain

Scientific datasets, frontier benchmarks, and training research.

Website: https://egeakgun.github.io/proofgrain/

This repository contains the public website, company vision, and aggregate results for an 18-problem mathematics benchmark across eight model routes. It does not contain the private problems, reference solutions, rubrics, hints, model responses, or evaluation studio.

## Results

- `benchmarks.json`: aggregate model statistics used by the interactive charts.
- `benchmark-results.csv`: downloadable aggregate results.
- Scores use GPT-6 Astra reference-and-rubric grading. The website documents the protocol, denominators, and metric definitions.

## Development

Serve this directory with a static HTTP server, such as `python3 -m http.server 8000`, and open the local address. No dependencies or build step are required.

GitHub Pages publishes the root of the `main` branch. `.nojekyll` keeps the assets unchanged.
