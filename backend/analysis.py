"""Sampled close approach with bounded local refinement."""
from datetime import datetime, timedelta
from math import sqrt
try:
    from scipy.optimize import minimize_scalar
except ImportError:
    minimize_scalar = None
def close_approach(primary, secondary, start: datetime, end: datetime, step_seconds: float):
    n=max(1,int((end-start).total_seconds()/step_seconds)); times=[start+timedelta(seconds=i*step_seconds) for i in range(n+1)]
    a=primary(times); b=secondary(times)
    def distance(i): return sqrt(sum((a[i][1][j]-b[i][1][j])**2 for j in range(3)))
    idx=min(range(len(times)), key=distance); best=distance(idx); best_time=times[idx]; method="sampled"
    if 0<idx<len(times):
        if minimize_scalar is not None:
            # Piecewise-linear interpolation keeps the optimizer bounded by sampled neighbors.
            def objective(x):
                lo,hi=idx-1,idx+1
                left=max(lo,min(hi-1,int(x//step_seconds))); f=x/step_seconds-left
                p=[a[left][1][j]*(1-f)+a[left+1][1][j]*f for j in range(3)]
                q=[b[left][1][j]*(1-f)+b[left+1][1][j]*f for j in range(3)]
                return sqrt(sum((p[j]-q[j])**2 for j in range(3)))
            result=minimize_scalar(objective,bounds=((idx-1)*step_seconds,(idx+1)*step_seconds),method="bounded")
            best_time=start+timedelta(seconds=result.x); best=float(result.fun); method="scipy-bounded-interpolation"
        else:
            # Deterministic bounded quadratic interpolation fallback when scipy is absent.
            y0,y1,y2=distance(idx-1),best,distance(idx+1); den=y0-2*y1+y2
            if den>1e-12:
                offset=max(-1.0,min(1.0,0.5*(y0-y2)/den)); best_time=times[idx]+timedelta(seconds=offset*step_seconds)
                best=max(0.0,y1-((y0-y2)**2)/(8*den)); method="bounded-quadratic-interpolation"
    rv=a[idx][2]; sv=b[idx][2]; speed=sqrt(sum((rv[j]-sv[j])**2 for j in range(3)))
    return best_time,best,speed,method
