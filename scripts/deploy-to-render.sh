#!/bin/bash

# Deploy to Render.com Script
# This script helps prepare and deploy your voice agent to Render

echo "🚀 Voice Agent Deployment Script for Render.com"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command_exists git; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites installed${NC}"

# Run pre-deployment check
echo -e "\n${YELLOW}Running pre-deployment checks...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please fix errors before deploying.${NC}"
    exit 1
fi

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}❌ render.yaml not found${NC}"
    exit 1
fi

# Git status check
echo -e "\n${YELLOW}Checking Git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status --short
    echo -e "\n${YELLOW}Would you like to commit these changes? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${YELLOW}Enter commit message:${NC}"
        read -r commit_message
        git add .
        git commit -m "$commit_message"
        echo -e "${GREEN}✅ Changes committed${NC}"
    fi
fi

# Check current branch
current_branch=$(git branch --show-current)
echo -e "\n${YELLOW}Current branch: ${current_branch}${NC}"

# Push to GitHub
echo -e "\n${YELLOW}Push to GitHub? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    git push origin "$current_branch"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Pushed to GitHub${NC}"
    else
        echo -e "${RED}❌ Push failed${NC}"
        exit 1
    fi
fi

# Deployment instructions
echo -e "\n${GREEN}🎉 Ready for deployment!${NC}"
echo -e "\n${YELLOW}Next steps to deploy on Render:${NC}"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repository: ai-voice-agent-lm"
echo "4. Render will auto-detect render.yaml"
echo "5. Set your environment variables:"
echo "   - OPENAI_API_KEY"
echo "   - TWILIO_ACCOUNT_SID"
echo "   - TWILIO_AUTH_TOKEN"
echo "   - TWILIO_PHONE_NUMBER"
echo "   - TWILIO_PHONE_NUMBERS (comma-separated)"
echo "   - CRM_API_BASE_URL"
echo "6. Click 'Create Web Service'"

echo -e "\n${YELLOW}After deployment:${NC}"
echo "1. Update Twilio webhook URLs to your Render URL"
echo "2. Test with a phone call"
echo "3. Monitor logs in Render dashboard"

echo -e "\n${GREEN}Good luck with your deployment! 🚀${NC}"