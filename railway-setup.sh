#!/bin/bash

# Railway Deployment Helper Script
# This script helps configure environment variables for Railway

echo "🚀 Railway Deployment Configuration Helper"
echo "=========================================="
echo ""

# Generate JWT Secret
echo "📝 Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "✅ Generated JWT_SECRET: $JWT_SECRET"
echo ""

# Backend Environment Variables
echo "📋 Backend Environment Variables"
echo "================================="
echo "Copy these to Railway Backend Service → Variables:"
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo "NODE_ENV=production"
echo "PORT=5000"
echo "MAX_FILE_SIZE=10485760"
echo ""
echo "Note: DATABASE_URL is automatically set by Railway PostgreSQL"
echo ""

# Frontend Environment Variables
echo "📋 Frontend Environment Variables"
echo "==================================="
echo "Copy these to Railway Frontend Service → Variables:"
echo ""
echo "VITE_API_URL=https://YOUR-BACKEND-URL.railway.app"
echo ""
echo "⚠️  Replace YOUR-BACKEND-URL with your actual Railway backend URL"
echo ""

# Create .env.railway files for reference
echo "💾 Creating .env.railway files for reference..."

# Backend .env.railway
cat > backend/.env.railway << EOF
# Railway Backend Environment Variables
# Copy these to Railway Backend Service → Variables tab

DATABASE_URL=postgresql://user:pass@host:5432/railway
# ⚠️ Railway auto-sets this when you add PostgreSQL database

JWT_SECRET=$JWT_SECRET
NODE_ENV=production
PORT=5000
MAX_FILE_SIZE=10485760

# Optional: WhatsApp Integration
# WHATSAPP_API_KEY=
# WHATSAPP_PHONE_NUMBER=
EOF

# Frontend .env.railway
cat > frontend/.env.railway << EOF
# Railway Frontend Environment Variables
# Copy these to Railway Frontend Service → Variables tab

VITE_API_URL=https://YOUR-BACKEND-URL.railway.app
# ⚠️ Replace YOUR-BACKEND-URL with your actual Railway backend domain
EOF

echo "✅ Created backend/.env.railway"
echo "✅ Created frontend/.env.railway"
echo ""

echo "🎯 Next Steps:"
echo "1. Go to https://railway.app and create account"
echo "2. Create new project from GitHub"
echo "3. Add PostgreSQL database"
echo "4. Copy variables from .env.railway files to Railway"
echo "5. Deploy!"
echo ""
echo "📖 See RAILWAY_DEPLOY.md for detailed instructions"
echo ""
echo "🎉 Happy deploying!"
