from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Status = Literal["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
Priority = Literal["LOW", "MEDIUM", "HIGH", "URGENT"]
Category = Literal["INFRASTRUCTURE", "SECURITY", "APPLICATION", "ACCESS", "GENERAL"]

class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    category: Category = "INFRASTRUCTURE"
    priority: Priority = "MEDIUM"
    status: Status = "OPEN"
    assignee: str = "Unassigned"

class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category: Category | None = None
    priority: Priority | None = None
    status: Status | None = None
    assignee: str | None = None

class TicketOut(TicketCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StatsOut(BaseModel):
    total: int
    open: int
    inProgress: int
    resolved: int
    closed: int
