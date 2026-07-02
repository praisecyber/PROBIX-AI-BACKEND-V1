from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import sympy as sp
from typing import Optional, Dict, Any

app = FastAPI(title="Math Verification Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VerifyStepRequest(BaseModel):
    step_id: Optional[int]
    expression: str
    expected: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None


class VerifyStepResponse(BaseModel):
    step_id: Optional[int]
    ok: bool
    reason: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


def _safe_parse(expr: str):
    try:
        return sp.sympify(expr, evaluate=True)
    except Exception:
        # fallback: try parsing as equation
        try:
            left, right = expr.split("=")
            return sp.Eq(sp.sympify(left), sp.sympify(right))
        except Exception:
            raise


@app.post("/verify_step", response_model=VerifyStepResponse)
def verify_step(req: VerifyStepRequest):
    """Verify a single math step. Returns ok=true if expression matches expected (if provided).

    Request example:
    {
      "step_id": 1,
      "expression": "2*x + 4",
      "expected": "2*(x+2)",
      "variables": {"x": 3}
    }
    """
    try:
        expr = _safe_parse(req.expression)
    except Exception as e:
        return VerifyStepResponse(step_id=req.step_id, ok=False, reason="parse_error", details={"error": str(e)})

    if req.expected:
        try:
            expected = _safe_parse(req.expected)
        except Exception as e:
            return VerifyStepResponse(step_id=req.step_id, ok=False, reason="expected_parse_error", details={"error": str(e)})

        try:
            # For equations, compare equality; otherwise compare simplified difference
            if isinstance(expr, sp.Equality) or isinstance(expected, sp.Equality):
                eq_expr = expr if isinstance(expr, sp.Equality) else sp.Eq(expr, 0)
                eq_exp = expected if isinstance(expected, sp.Equality) else sp.Eq(expected, 0)
                ok = sp.simplify(eq_expr.lhs - eq_expr.rhs - (eq_exp.lhs - eq_exp.rhs)) == 0
            else:
                diff = sp.simplify(sp.expand(expr - expected))
                ok = diff == 0
        except Exception as e:
            return VerifyStepResponse(step_id=req.step_id, ok=False, reason="compare_error", details={"error": str(e)})

        details = {"expr_simplified": str(sp.simplify(expr)), "expected_simplified": str(sp.simplify(expected))}
        reason = None if ok else "mismatch"
        return VerifyStepResponse(step_id=req.step_id, ok=bool(ok), reason=reason, details=details)

    # If no expected provided, try to evaluate with variables if given
    if req.variables:
        try:
            subs = {sp.symbols(k): v for k, v in req.variables.items()}
            val = float(sp.N(expr.subs(subs)))
            return VerifyStepResponse(step_id=req.step_id, ok=True, details={"value": val})
        except Exception as e:
            return VerifyStepResponse(step_id=req.step_id, ok=False, reason="eval_error", details={"error": str(e)})

    return VerifyStepResponse(step_id=req.step_id, ok=True, details={"expr": str(expr)})


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
