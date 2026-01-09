import asyncio
import json
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
import random
import re

@dataclass
class JobListing:
    id: str
    title: str
    company: str
    description: str
    location: str
    posted_date: str
    application_deadline: Optional[str] = None
    salary_range: Optional[str] = None
    required_skills: List[str] = None
    url: str = ""

@dataclass
class Application:
    job_id: str
    cover_letter: str
    resume_path: str
    applied_date: str
    status: str = "submitted"  # submitted, rejected, interview, accepted

class JobSearcher:
    """Simulates searching for content moderator jobs"""
    
    def __init__(self):
        self.job_listings = []
        self.load_sample_jobs()
    
    def load_sample_jobs(self):
        """Load sample content moderator job listings"""
        sample_jobs = [
            {
                "id": "job_001",
                "title": "Content Moderator",
                "company": "SocialMediaCorp",
                "description": "We're looking for a Content Moderator to review user-generated content and ensure compliance with our community guidelines. Responsibilities include reviewing posts, comments, and images for policy violations, reporting trends in content issues, and working with the trust and safety team.",
                "location": "Remote",
                "posted_date": "2024-01-10",
                "salary_range": "$40,000 - $50,000",
                "required_skills": ["attention to detail", "communication skills", "ability to work under pressure"],
                "url": "https://socialmediacorp.com/jobs/content-moderator"
            },
            {
                "id": "job_002",
                "title": "Trust & Safety Specialist",
                "company": "TechPlatform Inc",
                "description": "As a Trust & Safety Specialist, you'll evaluate user-generated content against our platform policies. You'll make critical decisions about content that affects millions of users daily, contribute to policy development, and work on challenging cases involving harassment, misinformation, and other policy violations.",
                "location": "San Francisco, CA",
                "posted_date": "2024-01-09",
                "salary_range": "$45,000 - $55,000",
                "required_skills": ["policy analysis", "decision-making", "research skills"],
                "url": "https://techplatform.com/jobs/trust-safety"
            },
            {
                "id": "job_003",
                "title": "Community Moderator",
                "company": "GamingNetwork",
                "description": "Join our team to moderate content across our gaming platform. You'll review text posts, chat messages, and user profiles for guideline violations. This role requires strong judgment skills and the ability to work in a fast-paced environment.",
                "location": "Remote",
                "posted_date": "2024-01-08",
                "salary_range": "$38,000 - $48,000",
                "required_skills": ["gaming experience", "fast reading comprehension", "multitasking"],
                "url": "https://gamingnetwork.com/jobs/community-mod"
            },
            {
                "id": "job_004",
                "title": "Content Review Specialist",
                "company": "ContentHub",
                "description": "We need Content Review Specialists to evaluate text, images, and videos for policy compliance. This position involves making real-time decisions on user-generated content while maintaining accuracy and speed requirements.",
                "location": "Austin, TX",
                "posted_date": "2024-01-07",
                "salary_range": "$42,000 - $52,000",
                "required_skills": ["attention to detail", "time management", "critical thinking"],
                "url": "https://contenthub.com/jobs/review-specialist"
            },
            {
                "id": "job_005",
                "title": "Moderation Associate",
                "company": "SocialNetwork Co",
                "description": "As a Moderation Associate, you'll be responsible for reviewing reported content, evaluating it against our community standards, and taking appropriate action. This role requires strong analytical skills and the ability to work efficiently with digital tools.",
                "location": "New York, NY",
                "posted_date": "2024-01-06",
                "salary_range": "$41,000 - $51,000",
                "required_skills": ["analytical thinking", "computer literacy", "written communication"],
                "url": "https://socialnetworkco.com/jobs/mod-associate"
            }
        ]
        
        for job_data in sample_jobs:
            job = JobListing(
                id=job_data["id"],
                title=job_data["title"],
                company=job_data["company"],
                description=job_data["description"],
                location=job_data["location"],
                posted_date=job_data["posted_date"],
                salary_range=job_data["salary_range"],
                required_skills=job_data["required_skills"],
                url=job_data["url"]
            )
            self.job_listings.append(job)
    
    def search_jobs(self, keywords: List[str] = None, location: str = None) -> List[JobListing]:
        """Search for jobs based on keywords and location"""
        results = self.job_listings[:]
        
        if keywords:
            keyword_lower = [kw.lower() for kw in keywords]
            results = [
                job for job in results 
                if any(kw in job.title.lower() or kw in job.description.lower() 
                      for kw in keyword_lower)
            ]
        
        if location:
            results = [
                job for job in results 
                if location.lower() in job.location.lower()
            ]
        
        return results

class CoverLetterGenerator:
    """Generates personalized cover letters for content moderator positions"""
    
    def __init__(self):
        self.personal_info = {
            "name": "AI Assistant",
            "email": "ai@example.com",
            "phone": "(555) 123-4567",
            "experience_years": 2,
            "skills": [
                "Content policy evaluation",
                "Fast and accurate decision making", 
                "Multilingual content review",
                "Trend identification",
                "Stress management under pressure"
            ]
        }
    
    def generate_cover_letter(self, job: JobListing) -> str:
        """Generate a personalized cover letter for the given job"""
        # Extract relevant skills from job description
        job_skills = self.extract_skills_from_description(job.description)
        
        cover_letter = f"""Dear Hiring Manager at {job.company},

I am writing to express my strong interest in the {job.title} position advertised on {job.url}. With my expertise in content evaluation and commitment to fostering safe online communities, I am excited about the opportunity to contribute to {job.company}'s mission.

In my previous experience, I have developed strong competencies in areas directly relevant to this role:

{self.format_skills_paragraph(job_skills)}

What particularly attracts me to this position at {job.company} is the opportunity to apply my analytical skills to protect your users while contributing to the development of effective content policies. I am impressed by {job.company}'s commitment to creating safe and inclusive online spaces.

My approach to content moderation combines meticulous attention to detail with efficient decision-making skills. I understand the importance of maintaining consistency while exercising sound judgment on nuanced cases. Additionally, I have experience managing high-volume workloads while maintaining accuracy standards.

I am excited about the possibility of joining your team and contributing to {job.company}'s continued success in building trusted online communities. Thank you for considering my application. I look forward to discussing how my skills and passion for creating positive online experiences can benefit your organization.

Sincerely,
{self.personal_info['name']}"""

        return cover_letter
    
    def extract_skills_from_description(self, description: str) -> List[str]:
        """Extract relevant skills from job description"""
        # Look for common content moderation skills in the description
        skill_keywords = [
            "attention to detail", "communication skills", "decision making", 
            "policy analysis", "research skills", "multitasking", 
            "time management", "critical thinking", "analytical thinking",
            "computer literacy", "written communication", "stress management",
            "accuracy", "efficiency", "judgment", "consistency"
        ]
        
        found_skills = []
        desc_lower = description.lower()
        for skill in skill_keywords:
            if skill in desc_lower:
                found_skills.append(skill)
        
        # Return top 3 skills or default ones if not enough found
        if len(found_skills) >= 3:
            return found_skills[:3]
        
        return ["attention to detail", "critical thinking", "decision making"]
    
    def format_skills_paragraph(self, relevant_skills: List[str]) -> str:
        """Format skills in a paragraph for the cover letter"""
        skills_text = "- "
        skills_text += "\n- ".join([
            skill.capitalize() + " - Demonstrated through consistent performance in evaluating diverse content scenarios."
            for skill in relevant_skills
        ])
        return skills_text

class ApplicationManager:
    """Manages the application process"""
    
    def __init__(self):
        self.applications = []
        self.cover_letter_generator = CoverLetterGenerator()
    
    async def submit_application(self, job: JobListing) -> Application:
        """Submit an application for a job"""
        print(f"Submitting application for {job.title} at {job.company}...")
        
        # Simulate some processing time
        await asyncio.sleep(1)
        
        # Generate a cover letter
        cover_letter = self.cover_letter_generator.generate_cover_letter(job)
        
        # Create application
        application = Application(
            job_id=job.id,
            cover_letter=cover_letter,
            resume_path="resume.pdf",  # In a real app, this would be dynamic
            applied_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            status="submitted"
        )
        
        self.applications.append(application)
        
        print(f"Application submitted successfully for {job.title}!")
        return application
    
    def get_application_status(self, job_id: str) -> Optional[Application]:
        """Get the status of an application"""
        for app in self.applications:
            if app.job_id == job_id:
                return app
        return None

class JobApplicationBot:
    """Main bot that searches for jobs and applies to them"""
    
    def __init__(self):
        self.searcher = JobSearcher()
        self.application_manager = ApplicationManager()
        self.applied_job_ids = set()
    
    async def find_and_apply(self, search_keywords: List[str], max_applications: int = 5) -> List[Application]:
        """Find jobs matching keywords and apply to them"""
        print(f"Searching for jobs with keywords: {search_keywords}")
        
        jobs = self.searcher.search_jobs(keywords=search_keywords)
        print(f"Found {len(jobs)} jobs matching criteria")
        
        applications = []
        for i, job in enumerate(jobs):
            if i >= max_applications:
                break
                
            if job.id in self.applied_job_ids:
                print(f"Already applied to {job.title} at {job.company}, skipping...")
                continue
            
            try:
                application = await self.application_manager.submit_application(job)
                self.applied_job_ids.add(job.id)
                applications.append(application)
                
                # Random delay between applications
                delay = random.randint(2, 5)
                print(f"Waiting {delay} seconds before next application...")
                await asyncio.sleep(delay)
                
            except Exception as e:
                print(f"Failed to apply to {job.title} at {job.company}: {str(e)}")
        
        return applications
    
    def get_application_summary(self) -> Dict:
        """Get a summary of applications"""
        total_applied = len(self.applied_job_ids)
        statuses = {}
        for app in self.application_manager.applications:
            status = app.status
            statuses[status] = statuses.get(status, 0) + 1
        
        return {
            "total_applications_submitted": total_applied,
            "application_breakdown": statuses
        }

# Main execution
async def main():
    print("🤖 Starting Job Application Bot for Content Moderator Positions")
    print("="*60)
    
    # Initialize the bot
    bot = JobApplicationBot()
    
    # Search for content moderator jobs
    search_terms = ["content moderator", "moderator", "trust", "safety", "community"]
    
    applications = await bot.find_and_apply(search_terms, max_applications=3)
    
    print("\n📊 Application Summary:")
    summary = bot.get_application_summary()
    print(json.dumps(summary, indent=2))
    
    print("\n✅ Job Application Bot completed successfully!")
    
    # Show a sample cover letter
    if applications:
        print(f"\n📄 Sample Cover Letter for {applications[0].job_id}:")
        print("-" * 50)
        print(applications[0].cover_letter[:500] + "..." if len(applications[0].cover_letter) > 500 else applications[0].cover_letter)

if __name__ == "__main__":
    asyncio.run(main())