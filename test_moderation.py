import requests
import json

def test_content_moderation():
    """Test the content moderation API"""
    print("Testing Content Moderation API...")
    
    # Test data
    test_cases = [
        {
            "content_item": {
                "content": "This is a perfectly fine post with no violations",
                "content_type": "text_post",
                "author_id": "user_123",
                "source_platform": "social_media"
            }
        },
        {
            "content_item": {
                "content": "I hate you, you stupid idiot! You're worthless!",
                "content_type": "comment",
                "author_id": "user_456",
                "source_platform": "forum"
            }
        },
        {
            "content_item": {
                "content": "Buy now! Click here for free money! Urgent action required!",
                "content_type": "message",
                "author_id": "user_789",
                "source_platform": "chat"
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases):
        print(f"\n--- Test Case {i+1} ---")
        print(f"Content: {test_case['content_item']['content']}")
        
        try:
            # In a real scenario, we'd call the running API server
            # For demonstration, we'll just show what would be sent
            print("Would send to API:", json.dumps(test_case, indent=2))
            
            # Simulate response based on content
            content = test_case['content_item']['content'].lower()
            
            if any(word in content for word in ['hate', 'stupid', 'idiot', 'worthless']):
                result = {
                    "item_id": f"test_{i+1}",
                    "is_approved": False,
                    "action": "reject",
                    "violations": ["harassment"],
                    "confidence_score": 0.8,
                    "explanation": "Detected violations: harassment",
                    "reviewed_at": "2024-01-10T10:00:00"
                }
            elif any(word in content for word in ['buy now', 'click here', 'free money', 'urgent action']):
                result = {
                    "item_id": f"test_{i+1}",
                    "is_approved": False,
                    "action": "reject",
                    "violations": ["spam"],
                    "confidence_score": 0.75,
                    "explanation": "Detected violations: spam",
                    "reviewed_at": "2024-01-10T10:00:00"
                }
            else:
                result = {
                    "item_id": f"test_{i+1}",
                    "is_approved": True,
                    "action": "approve",
                    "violations": [],
                    "confidence_score": 0.1,
                    "explanation": "No violations detected",
                    "reviewed_at": "2024-01-10T10:00:00"
                }
            
            print("Expected result:", json.dumps(result, indent=2))
            
        except Exception as e:
            print(f"Error in test case {i+1}: {str(e)}")

if __name__ == "__main__":
    test_content_moderation()