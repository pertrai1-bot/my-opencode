const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const ubsScriptPath = path.resolve(__dirname, '../scripts/ubs.sh');

test('UBS behavior tests', async (t) => {
  await t.test('all checks pass', () => {
    const result = execSync(`bash ${ubsScriptPath}`, {
      env: {
        ...process.env,
        TYPECHECK_CMD: 'echo "mock typecheck"',
        LINT_CMD: 'echo "mock lint"',
        TEST_CMD: 'echo "mock test"'
      },
      encoding: 'utf8'
    });
    
    assert.match(result, /mock typecheck/);
    assert.match(result, /mock lint/);
    assert.match(result, /mock test/);
    assert.match(result, /UBS_RESULT status=success stage=Complete exit_code=0/);
    assert.match(result, /🎉 UBS: All checks passed successfully!/);
  });

  await t.test('typecheck fails and stops execution', () => {
    let error;
    try {
      execSync(`bash ${ubsScriptPath}`, {
        env: {
          ...process.env,
          TYPECHECK_CMD: 'echo "mock typecheck error" && (exit 42)',
          LINT_CMD: 'echo "this should not run"',
          TEST_CMD: 'echo "this should not run"'
        },
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch (e) {
      error = e;
    }
    
    assert.ok(error, 'Expected script to fail');
    assert.strictEqual(error.status, 42);
    
    const stdout = error.stdout.toString();
    const stderr = error.stderr.toString();
    
    assert.match(stdout, /mock typecheck error/);
    assert.match(stderr, /❌ UBS FAILED on stage: TypeScript Check/);
    assert.match(stderr, /UBS_RESULT status=failure stage=TypeScript Check exit_code=42/);
    assert.doesNotMatch(stdout, /this should not run/);
  });

  await t.test('lint fails and stops execution', () => {
    let error;
    try {
      execSync(`bash ${ubsScriptPath}`, {
        env: {
          ...process.env,
          TYPECHECK_CMD: 'echo "mock typecheck"',
          LINT_CMD: 'echo "mock lint error" && (exit 12)',
          TEST_CMD: 'echo "this should not run"'
        },
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch (e) {
      error = e;
    }
    
    assert.ok(error, 'Expected script to fail');
    assert.strictEqual(error.status, 12);
    
    const stdout = error.stdout.toString();
    const stderr = error.stderr.toString();
    
    assert.match(stdout, /mock typecheck/);
    assert.match(stdout, /mock lint error/);
    assert.match(stderr, /❌ UBS FAILED on stage: ESLint/);
    assert.match(stderr, /UBS_RESULT status=failure stage=ESLint exit_code=12/);
    assert.doesNotMatch(stdout, /this should not run/);
  });

  await t.test('test suite fails and stops execution', () => {
    let error;
    try {
      execSync(`bash ${ubsScriptPath}`, {
        env: {
          ...process.env,
          TYPECHECK_CMD: 'echo "mock typecheck"',
          LINT_CMD: 'echo "mock lint"',
          TEST_CMD: 'echo "mock test error" && (exit 33)'
        },
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch (e) {
      error = e;
    }
    
    assert.ok(error, 'Expected script to fail');
    assert.strictEqual(error.status, 33);
    
    const stdout = error.stdout.toString();
    const stderr = error.stderr.toString();
    
    assert.match(stdout, /mock typecheck/);
    assert.match(stdout, /mock lint/);
    assert.match(stdout, /mock test error/);
    assert.match(stderr, /❌ UBS FAILED on stage: Test Suite/);
    assert.match(stderr, /UBS_RESULT status=failure stage=Test Suite exit_code=33/);
  });
});
