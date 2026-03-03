import json
import os
import threading
from pathlib import Path

# Get the backend directory path
BACKEND_DIR = Path(__file__).parent
CONFIG_FILE = BACKEND_DIR / "config.json"
DEFAULT_PROFILE = "default"
DB_PREFIX = "sql_app"

# In-memory config cache so every request doesn't read from disk.
# Protected by _config_lock for concurrent writes.
_config_lock = threading.Lock()
_config_cache: dict | None = None


def load_config() -> dict:
    """Return config, serving from memory cache after first read."""
    global _config_cache
    if _config_cache is not None:
        return _config_cache.copy()
    _default = {"current_profile": DEFAULT_PROFILE, "profiles": [DEFAULT_PROFILE]}
    if not os.path.exists(CONFIG_FILE):
        _config_cache = _default
        return _default.copy()
    with open(CONFIG_FILE, "r") as f:
        try:
            cfg = json.load(f)
        except json.JSONDecodeError:
            cfg = _default
    _config_cache = cfg
    return cfg.copy()


def save_config(config: dict) -> None:
    """Persist config atomically and update the in-memory cache.

    Writes to a .tmp file first then renames — prevents corrupt JSON
    if the process is killed mid-write.  The threading.Lock prevents
    two concurrent profile-switches from interleaving writes.
    """
    global _config_cache
    tmp = Path(str(CONFIG_FILE) + ".tmp")
    with _config_lock:
        with open(tmp, "w") as f:
            json.dump(config, f, indent=4)
        tmp.replace(CONFIG_FILE)  # atomic on POSIX
        _config_cache = config.copy()

def get_current_profile():
    config = load_config()
    return config.get("current_profile", DEFAULT_PROFILE)

def get_db_url(profile_name=None):
    if not profile_name:
        profile_name = get_current_profile()
    
    if profile_name == DEFAULT_PROFILE:
        db_file = f"{DB_PREFIX}.db"
    else:
        db_file = f"{DB_PREFIX}_{profile_name}.db"
    
    # Use backend directory for database files
    db_path = BACKEND_DIR / db_file
    return f"sqlite:///{db_path}"

def list_profiles():
    config = load_config()
    return config.get("profiles", [DEFAULT_PROFILE])

def create_profile(name: str):
    config = load_config()
    if name not in config["profiles"]:
        config["profiles"].append(name)
        save_config(config)
        return True
    return False

def switch_profile(name: str):
    config = load_config()
    if name in config["profiles"]:
        config["current_profile"] = name
        save_config(config)
        return True
    return False

def delete_profile(name: str):
    config = load_config()
    if name == DEFAULT_PROFILE:
        return False # Cannot delete default
        
    if name in config["profiles"]:
        config["profiles"].remove(name)
        if config["current_profile"] == name:
            config["current_profile"] = DEFAULT_PROFILE
        save_config(config)
        
        # Optionally delete the DB file
        db_file = BACKEND_DIR / f"{DB_PREFIX}_{name}.db"
        if db_file.exists():
            try:
                db_file.unlink()
            except:
                pass
        return True
    return False
