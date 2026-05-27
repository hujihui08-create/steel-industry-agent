#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo "  钢铁行业 Agent 自动化测试报告"
echo "========================================"
echo ""

BACKEND_LOG="/tmp/backend-test.log"
FRONTEND_LOG="/tmp/frontend-test.log"

# Backend tests
echo "[1/2] Running backend tests..."
cd "$PROJECT_ROOT/backend"
go test ./... -cover -count=1 -v 2>&1 | tee "$BACKEND_LOG"
BACKEND_RESULT=${PIPESTATUS[0]}
cd "$PROJECT_ROOT"

echo ""
echo ""

# Frontend tests
echo "[2/2] Running frontend tests..."
cd "$PROJECT_ROOT/steel-agent-web"
npx vitest run --reporter=verbose 2>&1 | tee "$FRONTEND_LOG"
FRONTEND_RESULT=${PIPESTATUS[0]}
cd "$PROJECT_ROOT"

echo ""
echo ""

# Summary
echo "========================================"
echo "  Test Results Summary"
echo "========================================"

BACKEND_TOTAL=$(grep -c "^--- " "$BACKEND_LOG" 2>/dev/null || echo 0)
BACKEND_PASS=$(grep -c "^--- PASS" "$BACKEND_LOG" 2>/dev/null || echo 0)
BACKEND_FAIL=$(grep -c "^--- FAIL" "$BACKEND_LOG" 2>/dev/null || echo 0)

echo "Backend:  PASS=$BACKEND_PASS FAIL=$BACKEND_FAIL TOTAL=$BACKEND_TOTAL"

FRONTEND_PASS=$(grep -c "✓" "$FRONTEND_LOG" 2>/dev/null || echo 0)
FRONTEND_FAIL=$(grep -c "×" "$FRONTEND_LOG" 2>/dev/null || echo 0)

echo "Frontend: PASS=$FRONTEND_PASS FAIL=$FRONTEND_FAIL"
echo ""

if [ "$BACKEND_RESULT" -eq 0 ] && [ "$FRONTEND_RESULT" -eq 0 ]; then
    echo "ALL TESTS PASSED"
    exit 0
else
    echo "SOME TESTS FAILED"
    exit 1
fi
