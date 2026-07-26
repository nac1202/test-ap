from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.db.database import get_db
from app.models.project import Project, ProjectMember, ProjectTimeline, RecentProject
from app.models.user import User
from app.models.audit import AuditLog
from app.api.deps import get_current_active_user, get_current_admin_user
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectMemberCreate,
    ProjectMemberResponse,
    ProjectTimelineCreate,
    ProjectTimelineResponse,
    ProducerResponse
)

router = APIRouter()

def get_user_display_name(user: Optional[User]) -> Optional[str]:
    if not user:
        return None
    name = f"{user.last_name or ''} {user.first_name or ''}".strip()
    return name if name else user.email

def log_audit(db: Session, user_id: int, action: str, details: dict):
    audit = AuditLog(user_id=user_id, action=action, details=details)
    db.add(audit)
    db.commit()

# --- Producers List ---

@router.get("/producers", response_model=List[ProducerResponse])
def list_producers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    users = db.query(User).filter(
        User.company_id == current_user.company_id,
        User.status == "active"
    ).order_by(User.id).all()

    return [
        ProducerResponse(
            id=u.id,
            name=get_user_display_name(u) or u.email,
            email=u.email
        )
        for u in users
    ]

# --- Projects CRUD ---

@router.get("", response_model=ProjectListResponse)
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (normal, warning, delayed)"),
    producer_id: Optional[int] = Query(None, description="Filter by producer user ID"),
    search: Optional[str] = Query(None, description="Search by project name"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size")
):
    query = db.query(Project)

    if status_filter:
        query = query.filter(Project.status == status_filter)
    if producer_id:
        query = query.filter(Project.producer_id == producer_id)
    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))

    total = query.count()
    projects = query.order_by(desc(Project.created_at)).offset((page - 1) * size).limit(size).all()

    # Enhance response with producer_name and member_count
    producer_ids = {p.producer_id for p in projects if p.producer_id}
    producers = {}
    if producer_ids:
        user_records = db.query(User).filter(User.id.in_(producer_ids)).all()
        producers = {u.id: get_user_display_name(u) for u in user_records}

    # Count members per project
    project_ids = [p.id for p in projects]
    member_counts = {}
    if project_ids:
        counts = db.query(
            ProjectMember.project_id, func.count(ProjectMember.user_id)
        ).filter(ProjectMember.project_id.in_(project_ids)).group_by(ProjectMember.project_id).all()
        member_counts = {p_id: count for p_id, count in counts}

    items = []
    for p in projects:
        item = ProjectResponse(
            id=p.id,
            name=p.name,
            producer_id=p.producer_id,
            producer_name=producers.get(p.producer_id),
            progress_rate=p.progress_rate,
            deadline=p.deadline,
            status=p.status,
            member_count=member_counts.get(p.id, 0),
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        items.append(item)

    return ProjectListResponse(
        items=items,
        total=total,
        page=page,
        size=size
    )

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify producer if specified
    producer_name = None
    if project_in.producer_id:
        producer = db.query(User).filter(User.id == project_in.producer_id).first()
        if not producer:
            raise HTTPException(status_code=400, detail="Producer user not found")
        producer_name = get_user_display_name(producer)

    project = Project(
        name=project_in.name,
        producer_id=project_in.producer_id,
        progress_rate=project_in.progress_rate,
        deadline=project_in.deadline,
        status=project_in.status
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Add producer as member by default if set
    initial_members = set(project_in.member_user_ids or [])
    if project_in.producer_id:
        initial_members.add(project_in.producer_id)

    for uid in initial_members:
        member = ProjectMember(
            project_id=project.id,
            user_id=uid,
            role="producer" if uid == project_in.producer_id else "member"
        )
        db.add(member)

    # Add initial timeline event
    timeline = ProjectTimeline(
        project_id=project.id,
        user_id=current_user.id,
        event_type="created",
        content=f"案件「{project.name}」を作成しました"
    )
    db.add(timeline)
    db.commit()

    log_audit(db, current_user.id, "create_project", {"project_id": project.id, "name": project.name})

    member_count = db.query(ProjectMember).filter(ProjectMember.project_id == project.id).count()

    return ProjectResponse(
        id=project.id,
        name=project.name,
        producer_id=project.producer_id,
        producer_name=producer_name,
        progress_rate=project.progress_rate,
        deadline=project.deadline,
        status=project.status,
        member_count=member_count,
        created_at=project.created_at,
        updated_at=project.updated_at
    )

@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update or insert RecentProject
    recent = db.query(RecentProject).filter(
        RecentProject.user_id == current_user.id,
        RecentProject.project_id == project_id
    ).first()
    if recent:
        recent.viewed_at = func.now()
    else:
        recent = RecentProject(user_id=current_user.id, project_id=project_id)
        db.add(recent)
    db.commit()

    # Get producer name
    producer_name = None
    if project.producer_id:
        producer = db.query(User).filter(User.id == project.producer_id).first()
        if producer:
            producer_name = get_user_display_name(producer)

    # Get Members with user names
    members_raw = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    user_ids = [m.user_id for m in members_raw]
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: get_user_display_name(u) for u in users}

    members = [
        ProjectMemberResponse(
            project_id=m.project_id,
            user_id=m.user_id,
            user_name=users_map.get(m.user_id),
            role=m.role,
            created_at=m.created_at
        )
        for m in members_raw
    ]

    # Get Timelines with user names
    timelines_raw = db.query(ProjectTimeline).filter(
        ProjectTimeline.project_id == project_id
    ).order_by(desc(ProjectTimeline.created_at)).all()
    timeline_uids = {t.user_id for t in timelines_raw if t.user_id}
    timeline_users_map = {}
    if timeline_uids:
        t_users = db.query(User).filter(User.id.in_(timeline_uids)).all()
        timeline_users_map = {u.id: get_user_display_name(u) for u in t_users}

    timelines = [
        ProjectTimelineResponse(
            id=t.id,
            project_id=t.project_id,
            user_id=t.user_id,
            user_name=timeline_users_map.get(t.user_id),
            event_type=t.event_type,
            content=t.content,
            created_at=t.created_at
        )
        for t in timelines_raw
    ]

    return ProjectDetailResponse(
        id=project.id,
        name=project.name,
        producer_id=project.producer_id,
        producer_name=producer_name,
        progress_rate=project.progress_rate,
        deadline=project.deadline,
        status=project.status,
        member_count=len(members),
        created_at=project.created_at,
        updated_at=project.updated_at,
        members=members,
        timelines=timelines
    )

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    changes = []
    if project_in.name is not None and project_in.name != project.name:
        changes.append(f"名称: {project.name} -> {project_in.name}")
        project.name = project_in.name

    if project_in.producer_id is not None and project_in.producer_id != project.producer_id:
        producer = db.query(User).filter(User.id == project_in.producer_id).first()
        if not producer:
            raise HTTPException(status_code=400, detail="Producer user not found")
        changes.append(f"プロデューサーID: {project.producer_id} -> {project_in.producer_id}")
        project.producer_id = project_in.producer_id

    if project_in.progress_rate is not None and project_in.progress_rate != project.progress_rate:
        changes.append(f"進捗率: {project.progress_rate}% -> {project_in.progress_rate}%")
        project.progress_rate = project_in.progress_rate

    if project_in.deadline is not None and project_in.deadline != project.deadline:
        changes.append(f"期日: {project.deadline} -> {project_in.deadline}")
        project.deadline = project_in.deadline

    if project_in.status is not None and project_in.status != project.status:
        changes.append(f"ステータス: {project.status} -> {project_in.status}")
        project.status = project_in.status

    if changes:
        db.commit()
        db.refresh(project)

        # Record timeline event for update
        timeline = ProjectTimeline(
            project_id=project.id,
            user_id=current_user.id,
            event_type="updated",
            content="案件情報を更新しました: " + ", ".join(changes)
        )
        db.add(timeline)
        db.commit()

        log_audit(db, current_user.id, "update_project", {"project_id": project.id, "changes": changes})

    producer_name = None
    if project.producer_id:
        producer = db.query(User).filter(User.id == project.producer_id).first()
        if producer:
            producer_name = get_user_display_name(producer)

    member_count = db.query(ProjectMember).filter(ProjectMember.project_id == project.id).count()

    return ProjectResponse(
        id=project.id,
        name=project.name,
        producer_id=project.producer_id,
        producer_name=producer_name,
        progress_rate=project.progress_rate,
        deadline=project.deadline,
        status=project.status,
        member_count=member_count,
        created_at=project.created_at,
        updated_at=project.updated_at
    )

@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_name = project.name

    # Cascade delete related entries
    db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()
    db.query(ProjectTimeline).filter(ProjectTimeline.project_id == project_id).delete()
    db.query(RecentProject).filter(RecentProject.project_id == project_id).delete()
    db.delete(project)
    db.commit()

    log_audit(db, admin_user.id, "delete_project", {"project_id": project_id, "name": project_name})

    return {"message": f"Project '{project_name}' (ID: {project_id}) has been deleted"}


# --- Members Management ---

@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
def list_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    user_ids = [m.user_id for m in members]
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: get_user_display_name(u) for u in users}

    return [
        ProjectMemberResponse(
            project_id=m.project_id,
            user_id=m.user_id,
            user_name=users_map.get(m.user_id),
            role=m.role,
            created_at=m.created_at
        )
        for m in members
    ]

@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
def add_project_member(
    project_id: int,
    member_in: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user = db.query(User).filter(User.id == member_in.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == member_in.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this project")

    member = ProjectMember(
        project_id=project_id,
        user_id=member_in.user_id,
        role=member_in.role
    )
    db.add(member)

    user_name = get_user_display_name(user)

    # Timeline event
    timeline = ProjectTimeline(
        project_id=project_id,
        user_id=current_user.id,
        event_type="member_added",
        content=f"メンバー「{user_name}」を配属しました (Role: {member_in.role})"
    )
    db.add(timeline)
    db.commit()
    db.refresh(member)

    log_audit(db, current_user.id, "add_project_member", {"project_id": project_id, "user_id": member_in.user_id})

    return ProjectMemberResponse(
        project_id=member.project_id,
        user_id=member.user_id,
        user_name=user_name,
        role=member.role,
        created_at=member.created_at
    )

@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")

    user = db.query(User).filter(User.id == user_id).first()
    user_name = get_user_display_name(user) or f"ID: {user_id}"

    db.delete(member)

    timeline = ProjectTimeline(
        project_id=project_id,
        user_id=current_user.id,
        event_type="member_removed",
        content=f"メンバー「{user_name}」を外しました"
    )
    db.add(timeline)
    db.commit()

    log_audit(db, current_user.id, "remove_project_member", {"project_id": project_id, "user_id": user_id})

    return {"message": f"Member {user_name} removed from project {project_id}"}


# --- Timelines Management ---

@router.get("/{project_id}/timelines", response_model=List[ProjectTimelineResponse])
def list_project_timelines(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    timelines = db.query(ProjectTimeline).filter(
        ProjectTimeline.project_id == project_id
    ).order_by(desc(ProjectTimeline.created_at)).all()

    user_ids = {t.user_id for t in timelines if t.user_id}
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: get_user_display_name(u) for u in users}

    return [
        ProjectTimelineResponse(
            id=t.id,
            project_id=t.project_id,
            user_id=t.user_id,
            user_name=users_map.get(t.user_id),
            event_type=t.event_type,
            content=t.content,
            created_at=t.created_at
        )
        for t in timelines
    ]

@router.post("/{project_id}/timelines", response_model=ProjectTimelineResponse, status_code=status.HTTP_201_CREATED)
def create_project_timeline(
    project_id: int,
    timeline_in: ProjectTimelineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    timeline = ProjectTimeline(
        project_id=project_id,
        user_id=current_user.id,
        event_type=timeline_in.event_type,
        content=timeline_in.content
    )
    db.add(timeline)
    db.commit()
    db.refresh(timeline)

    return ProjectTimelineResponse(
        id=timeline.id,
        project_id=timeline.project_id,
        user_id=timeline.user_id,
        user_name=get_user_display_name(current_user),
        event_type=timeline.event_type,
        content=timeline.content,
        created_at=timeline.created_at
    )
