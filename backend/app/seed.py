"""Creates the minimal local development workspace identity."""
from sqlalchemy.orm import Session

from app.models import Organization, User

DEMO_ORG_ID = 1
DEMO_USER_ID = 1

def ensure_development_workspace(db: Session):
    org = db.get(Organization, DEMO_ORG_ID)
    if not org:
        org = Organization(id=DEMO_ORG_ID, name="Development Workspace")
        db.add(org)
        db.flush()

    user = db.get(User, DEMO_USER_ID)
    if not user:
        db.add(User(
            id=DEMO_USER_ID, org_id=org.id,
            name="Local Developer", email="local@brandguard.dev", role="manager",
        ))
    db.commit()
