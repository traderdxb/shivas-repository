from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'forex_signals_db')]

# JWT Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "forex_trading_signals_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    full_name: Optional[str] = None

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    tier: SubscriptionTier = SubscriptionTier.FREE
    profile_picture: Optional[str] = None
    notification_preferences: Dict[str, bool] = {"email": True, "app": True}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_admin: bool = False

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    notification_preferences: Optional[Dict[str, bool]] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class CurrencyPair(str, Enum):
    EURUSD = "EUR/USD"
    GBPUSD = "GBP/USD"
    USDJPY = "USD/JPY"
    AUDUSD = "AUD/USD"
    USDCAD = "USD/CAD"
    NZDUSD = "NZD/USD"
    EURGBP = "EUR/GBP"
    EURJPY = "EUR/JPY"
    GBPJPY = "GBP/JPY"
    USDCHF = "USD/CHF"

class SignalCreate(BaseModel):
    currency_pair: CurrencyPair
    entry_price: float
    take_profit: float
    stop_loss: float
    notes: Optional[str] = None
    tier_required: SubscriptionTier = SubscriptionTier.FREE

class Signal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    currency_pair: CurrencyPair
    entry_price: float
    take_profit: float
    stop_loss: float
    notes: Optional[str] = None
    tier_required: SubscriptionTier
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    is_active: bool = True

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    related_to: Optional[str] = None  # Signal ID if related to a signal

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    related_to: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read: bool = False

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user_by_email(email: str):
    user = await db.users.find_one({"email": email})
    if user:
        return UserProfile(**user)

async def authenticate_user(email: str, password: str):
    user_dict = await db.users.find_one({"email": email})
    if not user_dict:
        return False
    if not verify_password(password, user_dict["password"]):
        return False
    return UserProfile(**{k: v for k, v in user_dict.items() if k != "password"})

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except jwt.PyJWTError:
        raise credentials_exception
    user = await db.users.find_one({"id": token_data.user_id})
    if user is None:
        raise credentials_exception
    return UserProfile(**{k: v for k, v in user.items() if k != "password"})

async def get_current_admin_user(current_user: UserProfile = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Basic routes
@api_router.get("/")
async def root():
    return {"message": "Forex Trading Signals API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Authentication endpoints
@api_router.post("/register", response_model=UserProfile)
async def register(user: UserCreate):
    # Check if email already exists
    existing_user = await get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_profile = UserProfile(
        email=user.email,
        username=user.username,
        full_name=user.full_name
    )
    
    user_dict = user_profile.dict()
    user_dict["password"] = hashed_password
    
    # Set first user as admin
    user_count = await db.users.count_documents({})
    if user_count == 0:
        user_dict["is_admin"] = True
    
    await db.users.insert_one(user_dict)
    return user_profile

@api_router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User profile endpoints
@api_router.get("/users/me", response_model=UserProfile)
async def read_users_me(current_user: UserProfile = Depends(get_current_user)):
    return current_user

@api_router.put("/users/me", response_model=UserProfile)
async def update_user_profile(
    update_data: UserProfileUpdate,
    current_user: UserProfile = Depends(get_current_user)
):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_dict}
        )
    updated_user = await db.users.find_one({"id": current_user.id})
    return UserProfile(**{k: v for k, v in updated_user.items() if k != "password"})

# Signal endpoints
@api_router.post("/signals", response_model=Signal)
async def create_signal(
    signal: SignalCreate,
    current_user: UserProfile = Depends(get_current_admin_user)
):
    signal_obj = Signal(**signal.dict())
    signal_dict = signal_obj.dict()
    
    # Insert the signal
    await db.signals.insert_one(signal_dict)
    
    # Create notifications for users based on tier
    users = await db.users.find(
        {"tier": {"$in": [signal.tier_required, SubscriptionTier.PREMIUM]}}
    ).to_list(1000)
    
    notifications = []
    for user in users:
        notification = Notification(
            user_id=user["id"],
            title=f"New Signal: {signal.currency_pair}",
            message=f"A new trading signal for {signal.currency_pair} is available.",
            related_to=signal_obj.id
        )
        notifications.append(notification.dict())
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    return signal_obj

@api_router.get("/signals", response_model=List[Signal])
async def get_signals(current_user: UserProfile = Depends(get_current_user)):
    # Filter signals based on user's subscription tier
    if current_user.tier == SubscriptionTier.PREMIUM:
        # Premium users get all signals
        signals = await db.signals.find({"is_active": True}).to_list(1000)
    else:
        # Other users get signals based on their tier
        signals = await db.signals.find({
            "tier_required": {"$lte": current_user.tier},
            "is_active": True
        }).to_list(1000)
    
    return [Signal(**signal) for signal in signals]

@api_router.get("/signals/{signal_id}", response_model=Signal)
async def get_signal(
    signal_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    signal = await db.signals.find_one({"id": signal_id})
    if not signal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signal not found"
        )
    
    signal_obj = Signal(**signal)
    
    # Check if user has access to this signal based on tier
    if (signal_obj.tier_required != SubscriptionTier.FREE and 
        current_user.tier < signal_obj.tier_required and
        current_user.tier != SubscriptionTier.PREMIUM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this signal. Upgrade your subscription."
        )
    
    return signal_obj

@api_router.put("/signals/{signal_id}", response_model=Signal)
async def update_signal(
    signal_id: str,
    signal_update: SignalCreate,
    current_user: UserProfile = Depends(get_current_admin_user)
):
    signal = await db.signals.find_one({"id": signal_id})
    if not signal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signal not found"
        )
    
    update_dict = signal_update.dict()
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.signals.update_one(
        {"id": signal_id},
        {"$set": update_dict}
    )
    
    updated_signal = await db.signals.find_one({"id": signal_id})
    return Signal(**updated_signal)

@api_router.delete("/signals/{signal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_signal(
    signal_id: str,
    current_user: UserProfile = Depends(get_current_admin_user)
):
    signal = await db.signals.find_one({"id": signal_id})
    if not signal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signal not found"
        )
    
    await db.signals.delete_one({"id": signal_id})
    return {"status": "deleted"}

# Notification endpoints
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: UserProfile = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(100)
    
    return [Notification(**notif) for notif in notifications]

@api_router.put("/notifications/{notification_id}/read", response_model=Notification)
async def mark_notification_as_read(
    notification_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    notification = await db.notifications.find_one({
        "id": notification_id,
        "user_id": current_user.id
    })
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    
    updated_notification = await db.notifications.find_one({"id": notification_id})
    return Notification(**updated_notification)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
