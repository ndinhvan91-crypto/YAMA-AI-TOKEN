
import os
from fastapi import FastAPI, HTTPException, Header
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="YAMA TOKEN API",
    version="1.0.0",
    description="Global AI Credit Platform"
)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = None

if url and key:
    supabase = create_client(url, key)


@app.get("/")
def home():
    return {
        "platform": "YAMA TOKEN",
        "version": "1.0.0",
        "status": "online"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/wallet")
def get_wallet(
    authorization: str = Header(None)
):
    if not supabase:
        raise HTTPException(503, "Database not configured")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")

    token = authorization.replace("Bearer ", "", 1)

    user = supabase.auth.get_user(token)

    if not user or not user.user:
        raise HTTPException(401, "Invalid session")

    result = (
        supabase.table("wallets")
        .select("balance")
        .eq("user_id", user.user.id)
        .single()
        .execute()
    )

    return {
        "success": True,
        "balance": result.data["balance"],
        "currency": "YAMA CREDITS"
    }


@app.get("/services")
def get_services():
    if not supabase:
        raise HTTPException(503, "Database not configured")

    result = (
        supabase.table("ai_services")
        .select("slug,name,credit_cost")
        .eq("active", True)
        .execute()
    )

    return {
        "success": True,
        "services": result.data
    }
