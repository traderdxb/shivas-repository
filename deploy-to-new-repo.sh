#!/bin/bash

# Fleet Inventory - Deploy to New Repository Script
# This script prepares and pushes your Fleet Inventory app to the new GitHub repository

echo "🚀 Fleet Inventory - Repository Migration Script"
echo "=================================================="
echo ""

# Configuration
NEW_REPO_URL="https://github.com/traderdxb/fleetmanagement.git"
TEMP_DIR="fleet-inventory-deploy"

echo "📦 Preparing deployment package..."
echo ""

# Create temporary directory
if [ -d "$TEMP_DIR" ]; then
    echo "⚠️  Temporary directory exists. Removing..."
    rm -rf "$TEMP_DIR"
fi

mkdir -p "$TEMP_DIR"
echo "✅ Created temporary directory: $TEMP_DIR"

# Copy necessary files and folders
echo ""
echo "📋 Copying Fleet Inventory files..."

# Copy folders
cp -r backend "$TEMP_DIR/"
cp -r frontend "$TEMP_DIR/"

# Copy Docker and configuration files
cp docker-compose.yml "$TEMP_DIR/"
cp railway.json "$TEMP_DIR/"
cp .gitignore "$TEMP_DIR/"

# Copy documentation
cp FLEET_README.md "$TEMP_DIR/README.md"
cp QUICKSTART.md "$TEMP_DIR/"
cp RAILWAY_DEPLOY.md "$TEMP_DIR/"
cp DEPLOYMENT.md "$TEMP_DIR/"
cp DEPLOYMENT_CHECKLIST.md "$TEMP_DIR/"
cp DEPLOYMENT_SUMMARY.md "$TEMP_DIR/"
cp POST_DEPLOYMENT.md "$TEMP_DIR/"

# Copy scripts
cp railway-setup.sh "$TEMP_DIR/"
cp test-deployment.sh "$TEMP_DIR/"

echo "✅ Files copied successfully!"
echo ""

# Navigate to temporary directory
cd "$TEMP_DIR"

# Initialize git repository
echo "🔧 Initializing Git repository..."
git init
git add .
git commit -m "Add Fleet Inventory Management Application

Complete fleet and inventory management system with:
- Backend: Node.js/Express/PostgreSQL/Prisma
- Frontend: React/Vite/Material-UI
- Database: 15 tables with complete schema
- Features: Device tracking, assignments, renewals, reports
- Deployment: Docker-ready, Railway-optimized
- Documentation: Complete guides and helpers

Includes:
✅ 14 Backend API routes
✅ 12 Frontend pages
✅ Role-based access control
✅ Excel import/export
✅ PDF certificate generation
✅ Analytics dashboard
✅ Complete documentation"

echo "✅ Repository initialized and committed!"
echo ""

# Add remote and push
echo "🚀 Pushing to GitHub..."
echo "Repository: $NEW_REPO_URL"
echo ""

git remote add origin "$NEW_REPO_URL"

# Try to push
if git push -u origin main; then
    echo ""
    echo "✅ SUCCESS! Code pushed to GitHub!"
    echo ""
    echo "🎉 Your Fleet Inventory app is now at:"
    echo "   https://github.com/traderdxb/fleetmanagement"
    echo ""
    echo "🔗 Quick Links:"
    echo "   Repository: https://github.com/traderdxb/fleetmanagement"
    echo "   Backend: https://github.com/traderdxb/fleetmanagement/tree/main/backend"
    echo "   Frontend: https://github.com/traderdxb/fleetmanagement/tree/main/frontend"
    echo ""
    echo "✨ Next Steps:"
    echo "   1. Verify files on GitHub"
    echo "   2. Deploy to Railway"
    echo "   3. Configure environment variables"
    echo ""
    echo "📖 Cleanup:"
    echo "   You can now delete the temporary directory:"
    echo "   cd .. && rm -rf $TEMP_DIR"
    echo ""
else
    echo ""
    echo "❌ Push failed! This might be due to:"
    echo "   - Authentication issues"
    echo "   - Repository not empty"
    echo "   - Network issues"
    echo ""
    echo "📋 Manual Method:"
    echo "   1. The code is ready in: $(pwd)"
    echo "   2. Check GitHub authentication"
    echo "   3. Try: git push -u origin main --force"
    echo ""
    echo "Or upload manually:"
    echo "   1. Go to: https://github.com/traderdxb/fleetmanagement"
    echo "   2. Upload files from: $(pwd)"
    echo ""
fi
