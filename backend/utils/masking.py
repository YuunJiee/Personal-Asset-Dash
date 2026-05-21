def mask_api_key(key: str | None) -> str | None:
    if not key:
        return None
    return f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "****"
