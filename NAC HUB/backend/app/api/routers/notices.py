from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
import json

from app.db.database import get_db
from app.models.user import User
from app.models.notice import Notice
from app.models.audit import AuditLog
from app.api.deps import get_current_active_user, get_current_active_admin
from app.schemas.notice import NoticeCreate, NoticeUpdate, NoticeResponse, NoticeList

router = APIRouter()

def log_audit(db: Session, request: Request, user: User, action: str, entity_name: str, entity_id: int, details: dict):
    client_ip = request.client.host if request.client else "unknown"
    audit = AuditLog(
        user_id=user.id,
        company_id=user.company_id,
        action=action,
        entity_type="Notice",
        entity_name=entity_name,
        entity_id=entity_id,
        details=json.dumps(details),
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent", "unknown")
    )
    db.add(audit)
    db.commit()

@router.get("", response_model=NoticeList)
def get_notices(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Notice).filter(Notice.company_id == current_user.company_id)
    if active_only:
        query = query.filter(Notice.is_active == True)
    
    total = query.count()
    items = query.order_by(desc(Notice.created_at)).offset(skip).limit(limit).all()
    
    return NoticeList(total=total, items=items)

@router.get("/{notice_id}", response_model=NoticeResponse)
def get_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    notice = db.query(Notice).filter(
        Notice.id == notice_id,
        Notice.company_id == current_user.company_id
    ).first()
    
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
        
    return notice

@router.post("", response_model=NoticeResponse)
def create_notice(
    notice_in: NoticeCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    notice = Notice(
        **notice_in.model_dump(),
        company_id=current_user.company_id,
        created_by_id=current_user.id
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    
    log_audit(
        db=db, request=request, user=current_user,
        action="CREATE_NOTICE", entity_name=notice.title, entity_id=notice.id,
        details={"category": notice.category, "is_important": notice.is_important}
    )
    
    return notice

@router.put("/{notice_id}", response_model=NoticeResponse)
def update_notice(
    notice_id: int,
    notice_in: NoticeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_admin)
):
    notice = db.query(Notice).filter(
        Notice.id == notice_id,
        Notice.company_id == current_user.company_id
    ).first()
    
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
        
    update_data = notice_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(notice, field, value)
        
    db.commit()
    db.refresh(notice)
    
    log_audit(
        db=db, request=request, user=current_user,
        action="UPDATE_NOTICE", entity_name=notice.title, entity_id=notice.id,
        details={"updated_fields": list(update_data.keys())}
    )
    
    return notice
