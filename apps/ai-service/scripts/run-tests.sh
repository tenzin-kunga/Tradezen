#!/usr/bin/env bash
# Run ai-service smoke tests
set -e

cd "$(dirname "$0")/.."

echo "=== Running smoke tests ==="
python -m pytest tests/ -v --tb=short

echo ""
echo "=== Running evaluation ==="
python -m app.evaluation.runner

echo ""
echo "=== All checks passed ==="
