// Node helper to call the Math Verification microservice
// Uses global fetch (Node 18+) or a polyfill. Returns parsed JSON.

const MATH_SERVICE_BASE = process.env.MATH_SERVICE_URL || 'http://localhost:8003'

async function verifyStep({ step_id = null, expression, expected = null, variables = null }) {
  const body = { step_id, expression };
  if (expected !== null) body.expected = expected;
  if (variables !== null) body.variables = variables;

  const res = await fetch(`${MATH_SERVICE_BASE}/verify_step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`math service responded ${res.status}`);
  return await res.json();
}

module.exports = { verifyStep };

/* Example usage:
const { verifyStep } = require('./utils/mathServiceClient')
(async ()=>{
  const r = await verifyStep({ step_id:1, expression:'2*x+4', expected:'2*(x+2)'})
  console.log(r)
})()
*/
