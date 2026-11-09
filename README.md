# Proofgrain

Scientific datasets, frontier benchmarks, and training research.

Website: https://egeakgun.github.io/proofgrain/

This repository contains the public website, company vision, and aggregate results for an 18-problem mathematics benchmark across eight model routes. It does not contain the private problems, reference solutions, rubrics, hints, model responses, or evaluation studio.

## Results

- `benchmarks.json`: aggregate model statistics used by the interactive charts.
- `benchmark-results.csv`: downloadable aggregate results.
- All 144 assigned attempts receive a response-based score. Partial answers and unfinished reasoning retain their recorded rubric points; empty responses score 0/7. Complete rubric points remain usable when only verdict/issue labels conflict. Each model’s mean, score distribution, full-credit rate, and bootstrap interval use all 18 assigned tasks.
- Scores use GPT-6 Astra reference-and-rubric grading and the `all_assigned_recorded_response_v2` scoring policy. The original generation and grading records are unchanged.

## Development

Serve this directory with a static HTTP server, such as `python3 -m http.server 8000`, and open the local address. No dependencies or build step are required.

GitHub Pages publishes the root of the `main` branch. `.nojekyll` keeps the assets unchanged.
