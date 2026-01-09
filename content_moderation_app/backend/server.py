from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import logging
from enum import Enum
import uuid
from datetime import datetime
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Content Moderation API", description="API for moderating user-generated content")

# Enums for content types and violation categories
class ContentType(str, Enum):
    TEXT_POST = "text_post"
    COMMENT = "comment"
    FORUM_POST = "forum_post"
    REVIEW = "review"
    MESSAGE = "message"

class ViolationCategory(str, Enum):
    HATE_SPEECH = "hate_speech"
    HARASSMENT = "harassment"
    SPAM = "spam"
    NSFW = "nsfw"
    VIOLENCE = "violence"
    FALSE_INFORMATION = "false_information"
    PRIVACY_VIOLATION = "privacy_violation"
    OTHER = "other"

class ModerationAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    FLAG_FOR_REVIEW = "flag_for_review"
    WARNING = "warning"

# Request/Response models
class ContentItem(BaseModel):
    id: Optional[str] = None
    content: str
    content_type: ContentType
    author_id: str
    source_platform: str
    created_at: Optional[datetime] = None

class ModerationResult(BaseModel):
    item_id: str
    is_approved: bool
    action: ModerationAction
    violations: List[ViolationCategory]
    confidence_score: float  # Between 0 and 1
    explanation: str
    reviewed_at: datetime

class ModerationRequest(BaseModel):
    content_item: ContentItem
    auto_approve_safe: bool = True

class BatchModerationRequest(BaseModel):
    content_items: List[ContentItem]

class BatchModerationResponse(BaseModel):
    results: List[ModerationResult]

# In-memory storage for demo purposes
moderation_results = {}
content_items = {}

# Simple rule-based content detection
class ContentDetector:
    @staticmethod
    def detect_hate_speech(content: str) -> tuple[bool, float, str]:
        """Detect hate speech with confidence score"""
        content_lower = content.lower()
        
        # More sophisticated pattern matching would go here
        patterns = [
            r"\bfuck\b|\bdamn\b|\bbitch\b|\basshole\b",  # Mild profanity
            r"\bhate.*you\b|\bkick.*ass\b",  # Potential harassment
        ]
        
        violations = []
        max_confidence = 0.0
        
        # Simple keyword checking (in real app, use ML model)
        hate_indicators = ["stupid", "idiot", "moron", "hate", "worthless"]
        for indicator in hate_indicators:
            if indicator in content_lower:
                violations.append(ViolationCategory.HARASSMENT)
                max_confidence = max(max_confidence, 0.6)
                
        # Spam indicators
        spam_indicators = ["buy now", "click here", "free money", "urgent action"]
        for indicator in spam_indicators:
            if indicator in content_lower:
                violations.append(ViolationCategory.SPAM)
                max_confidence = max(max_confidence, 0.7)
        
        # Violence indicators
        violence_indicators = ["kill", "murder", "attack", "destroy", "harm"]
        for indicator in violence_indicators:
            if indicator in content_lower:
                violations.append(ViolationCategory.VIOLENCE)
                max_confidence = max(max_confidence, 0.8)
        
        # NSFW indicators
        nsfw_indicators = ["sex", "nude", "porn", "xxx", "adult"]
        for indicator in nsfw_indicators:
            if indicator in content_lower:
                violations.append(ViolationCategory.NSFW)
                max_confidence = max(max_confidence, 0.8)
        
        is_violation = len(violations) > 0
        return is_violation, max_confidence, f"Detected violations: {', '.join([v.value for v in violations])}"

    @staticmethod
    def classify_content(content_item: ContentItem) -> ModerationResult:
        """Classify content and return moderation decision"""
        content = content_item.content
        item_id = content_item.id or str(uuid.uuid4())
        
        # Run detection
        is_violation, confidence, explanation = ContentDetector.detect_hate_speech(content)
        
        # Determine action based on confidence and violations
        violations = []
        if is_violation:
            # This would be more complex in a real system
            violations = [v for v in ViolationCategory.__members__.values() 
                         if v.value in explanation.lower()]
        
        if confidence < 0.3:
            action = ModerationAction.APPROVE
            is_approved = True
        elif confidence < 0.7:
            action = ModerationAction.FLAG_FOR_REVIEW
            is_approved = False
        else:
            action = ModerationAction.REJECT
            is_approved = False
        
        return ModerationResult(
            item_id=item_id,
            is_approved=is_approved,
            action=action,
            violations=violations,
            confidence_score=confidence,
            explanation=explanation,
            reviewed_at=datetime.utcnow()
        )

@app.post("/moderate", response_model=ModerationResult)
async def moderate_content(request: ModerationRequest):
    """
    Moderate a single piece of content
    """
    logger.info(f"Received content moderation request for author {request.content_item.author_id}")
    
    # Store content item
    item_id = request.content_item.id or str(uuid.uuid4())
    content_item = request.content_item.copy(update={"id": item_id})
    content_items[item_id] = content_item
    
    # Perform moderation
    result = ContentDetector.classify_content(content_item)
    
    # Store result
    moderation_results[item_id] = result
    
    return result

@app.post("/moderate/batch", response_model=BatchModerationResponse)
async def moderate_batch(request: BatchModerationRequest):
    """
    Moderate multiple pieces of content at once
    """
    results = []
    
    for content_item in request.content_items:
        item_id = content_item.id or str(uuid.uuid4())
        content_item.id = item_id
        
        result = ContentDetector.classify_content(content_item)
        results.append(result)
        
        # Store content and result
        content_items[item_id] = content_item
        moderation_results[item_id] = result
    
    return BatchModerationResponse(results=results)

@app.get("/result/{item_id}", response_model=ModerationResult)
async def get_moderation_result(item_id: str):
    """
    Get the moderation result for a specific content item
    """
    if item_id not in moderation_results:
        raise HTTPException(status_code=404, detail="Moderation result not found")
    
    return moderation_results[item_id]

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy", "service": "content-moderation-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)