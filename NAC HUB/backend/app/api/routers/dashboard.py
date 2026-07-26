from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.db.database import get_db
from app.models.user import User
from app.models.project import Project, RecentProject
from app.models.notification import Notification
from app.models.workflow import Workflow
from app.api.deps import get_current_active_user
from app.schemas.dashboard import (
    DashboardResponse,
    ProjectSummarySchema,
    RecentProjectSchema,
    NotificationSchema,
    TaskSchema,
    IntegrationsSchema
)

router = APIRouter()

@router.get("", response_model=DashboardResponse)
def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get aggregated home dashboard data for current user.
    Scope: Current user's company_id.
    """
    # 1. Project Summary (Company Scope via Producer User)
    base_projects_query = (
        db.query(Project)
        .outerjoin(User, Project.producer_id == User.id)
        .filter(or_(User.company_id == current_user.company_id, Project.producer_id == current_user.id))
    )

    total_projects = base_projects_query.count()
    normal_count = base_projects_query.filter(Project.status == "normal").count()
    warning_count = base_projects_query.filter(Project.status == "warning").count()
    delayed_count = base_projects_query.filter(Project.status == "delayed").count()

    # 近日期限 (今後7日以内かつ未遅延)
    now = datetime.now(timezone.utc)
    next_week = now + timedelta(days=7)
    due_soon_count = base_projects_query.filter(
        Project.deadline.isnot(None),
        Project.deadline >= now,
        Project.deadline <= next_week
    ).count()

    summary = ProjectSummarySchema(
        total=total_projects,
        normal=normal_count,
        warning=warning_count,
        delayed=delayed_count,
        due_soon=due_soon_count
    )

    # 2. Recent Projects (User Scope)
    recent_records = (
        db.query(RecentProject, Project)
        .join(Project, RecentProject.project_id == Project.id)
        .filter(RecentProject.user_id == current_user.id)
        .order_by(desc(RecentProject.viewed_at))
        .limit(5)
        .all()
    )

    recent_projects_list = []
    for rp, p in recent_records:
        recent_projects_list.append(
            RecentProjectSchema(
                id=p.id,
                name=p.name,
                status=p.status,
                progress_rate=p.progress_rate,
                deadline=p.deadline,
                viewed_at=rp.viewed_at
            )
        )

    # 3. Notifications (User Scope & Real Fields)
    notifications_query = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(5)
        .all()
    )

    notifications_list = []
    for n in notifications_query:
        notifications_list.append(
            NotificationSchema(
                id=n.id,
                title=n.title,
                content=n.body,
                category=n.type,
                is_read=n.is_read,
                created_at=n.created_at
            )
        )

    # 4. Tasks / Workflows (User Scope)
    workflows_query = (
        db.query(Workflow)
        .order_by(desc(Workflow.created_at))
        .limit(5)
        .all()
    )

    tasks_list = []
    for w in workflows_query:
        title = w.data.get("title", f"{w.type} 申請") if isinstance(w.data, dict) else f"{w.type} 申請"
        tasks_list.append(
            TaskSchema(
                id=w.id,
                title=title,
                status=w.status,
                due_date=w.created_at
            )
        )

    # 5. Integrations Status (False for unconnected external services)
    integrations = IntegrationsSchema(
        weather=False,
        hotbiz=False,
        slack=False,
        notepm=False,
        google_drive=False
    )

    return DashboardResponse(
        generated_at=datetime.now(timezone.utc),
        project_summary=summary,
        recent_projects=recent_projects_list,
        notifications=notifications_list,
        tasks=tasks_list,
        integrations=integrations
    )
