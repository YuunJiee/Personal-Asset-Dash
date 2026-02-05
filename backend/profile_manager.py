import json
import os
from pathlib import Path

CONFIG_FILE = "config.json"
DEFAULT_PROFILE = "default"
DB_PREFIX = "sql_app"

def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {"current_profile": DEFAULT_PROFILE, "profiles": [DEFAULT_PROFILE]}
    with open(CONFIG_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {"current_profile": DEFAULT_PROFILE, "profiles": [DEFAULT_PROFILE]}

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=4)

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
        
    return f"sqlite:///./{db_file}"

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
        db_file = f"{DB_PREFIX}_{name}.db"
        if os.path.exists(db_file):
            try:
                os.remove(db_file)
            except:
                pass
        return True
    return False
