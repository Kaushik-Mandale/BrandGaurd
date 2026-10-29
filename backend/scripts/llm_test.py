from app.config import settings
from app.services.llm import llm_available, chat_json
from app.db import SessionLocal
from sqlalchemy import text
print("key loaded   :", llm_available())
print("base url     :", settings.LLM_BASE_URL)
print("model        :", settings.LLM_MODEL)
try:
    print("LLM reply    :", chat_json("Return only JSON.", 'Return {"ok": true}'))
except Exception as e:
    print("LLM FAILED   :", repr(e))
with SessionLocal() as db:
    print("brand chunks :", db.execute(text("select count(*) from brand_chunks")).scalar())
    print("brand rules  :", db.execute(text("select count(*) from brand_rules")).scalar())
