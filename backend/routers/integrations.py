from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models
from .. import models, service
from ..database import get_db
from ..services import max_service, pionex_service, binance_service, wallet_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(
    prefix="/api/integrations",
    tags=["integrations"]
)

class ConnectionSchema(BaseModel):
    name: str
    provider: str # pionex, max, wallet
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    address: Optional[str] = None

class ConnectionResponse(BaseModel):
    id: int
    name: str
    provider: str
    # Do not return secrets
    api_key_masked: Optional[str] = None
    address: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=list[ConnectionResponse])
def get_connections(db: Session = Depends(get_db)):
    conns = db.query(models.CryptoConnection).filter(models.CryptoConnection.is_active == True).all()
    # Mask keys
    res = []
    for c in conns:
        masked = None
        if c.api_key:
            masked = f"{c.api_key[:4]}...{c.api_key[-4:]}" if len(c.api_key) > 8 else "****"
        
        res.append(ConnectionResponse(
            id=c.id,
            name=c.name,
            provider=c.provider,
            api_key_masked=masked,
            address=c.address,
            is_active=c.is_active
        ))
    return res

@router.post("/")
def create_connection(conn: ConnectionSchema, db: Session = Depends(get_db)):
    new_conn = models.CryptoConnection(
        name=conn.name,
        provider=conn.provider,
        api_key=conn.api_key,
        api_secret=conn.api_secret,
        address=conn.address
    )
    db.add(new_conn)
    db.commit()
    db.refresh(new_conn)
    
    # Return masked
    masked = None
    if new_conn.api_key:
        masked = f"{new_conn.api_key[:4]}...{new_conn.api_key[-4:]}" if len(new_conn.api_key) > 8 else "****"
        
    return ConnectionResponse(
        id=new_conn.id,
        name=new_conn.name,
        provider=new_conn.provider,
        api_key_masked=masked,
        address=new_conn.address,
        is_active=new_conn.is_active
    )

@router.delete("/{conn_id}")
def delete_connection(conn_id: int, db: Session = Depends(get_db)):
    conn = db.query(models.CryptoConnection).filter(models.CryptoConnection.id == conn_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    # Instead of hard delete, maybe soft delete or delete associated assets?
    # For now, let's hard delete but careful with assets.
    # The model has cascade="all, delete-orphan" on assets relationship, so assets will be deleted.
    
    db.delete(conn)
    db.commit()
    return {"message": "Connection deleted"}

@router.post("/sync/{provider}")
def sync_provider(provider: str, db: Session = Depends(get_db)):
    if provider == 'max':
        success = max_service.sync_max_assets(db)
        if not success:
            raise HTTPException(status_code=400, detail="Sync failed or no active connections")
    elif provider == 'pionex':
        success = pionex_service.sync_pionex_assets(db)
        if not success:
             raise HTTPException(status_code=400, detail="Sync failed or no active connections")
    elif provider == 'binance':
        success = binance_service.sync_binance_assets(db)
        if not success:
             raise HTTPException(status_code=400, detail="Sync failed or no active connections")
    elif provider == 'wallet':
        success = wallet_service.sync_wallets(db)
        if not success:
             raise HTTPException(status_code=400, detail="Sync failed or no active connections")
    else:
        raise HTTPException(status_code=400, detail="Unknown provider")
    
    return {"status": "success", "message": f"{provider} synced successfully"}

@router.post("/discover/{connection_id}")
def discover_wallet_assets(connection_id: int, db: Session = Depends(get_db)):
    result = wallet_service.discover_tokens(db, connection_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
