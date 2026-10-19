"""SGP4 propagation. Contract: TEME positions in km and velocities in km/s."""
from datetime import datetime, timezone
from .catalog import TLERecord
try:
    from sgp4.api import Satrec, jday
except ImportError: Satrec = None; jday = None

class PropagationUnavailable(RuntimeError): pass
def propagate(record: TLERecord, times: list[datetime]):
    if Satrec is None: raise PropagationUnavailable("sgp4 is not installed")
    sat=Satrec.twoline2rv(record.line1,record.line2); result=[]
    for when in times:
        t=when.astimezone(timezone.utc); jd,fr=jday(t.year,t.month,t.day,t.hour,t.minute,t.second+t.microsecond/1e6)
        error,position,velocity=sat.sgp4(jd,fr)
        if error: raise PropagationUnavailable(f"SGP4 error code {error}")
        result.append((when,tuple(position),tuple(velocity)))
    return result
