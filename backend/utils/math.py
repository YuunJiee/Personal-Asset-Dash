import math


def safe_float(val) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)) and (math.isnan(val) or math.isinf(val)):
        return 0.0
    return val
