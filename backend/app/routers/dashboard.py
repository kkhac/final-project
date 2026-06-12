from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dashboard import DashboardStats, RecentRun
from app.services.dashboard_service import get_stats, get_recent_runs

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def read_stats(db: Session = Depends(get_db)):
    return get_stats(db)


@router.get("/recent-runs", response_model=List[RecentRun])
def read_recent_runs(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return get_recent_runs(db, limit=limit)
