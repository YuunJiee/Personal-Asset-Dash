from backend.database import SessionLocal
from backend.models import Asset

def migrate_categories():
    db = SessionLocal()
    assets = db.query(Asset).filter(Asset.category == 'Investment').all()
    print(f'Found {len(assets)} assets with category Investment')
    for a in assets:
        name_lower = (a.name or '').lower()
        sub_cat = (a.sub_category or '').lower()
        ticker_lower = (a.ticker or '').lower()
        if 'crypto' in sub_cat or 'eth' in name_lower or 'btc' in name_lower or 'sol' in ticker_lower or 'usdt' in ticker_lower:
            a.category = 'Crypto'
        else:
            a.category = 'Stock'
        print(f'Migrated {a.name} to {a.category}')
    db.commit()
    db.close()

if __name__ == '__main__':
    migrate_categories()
