#!/bin/bash
# deploy/deploy-vercel.sh - Vercel deployment script for IKIGAI X-ONE
# This script checks environment variables and deploys to Vercel

# Text formatting
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}IKIGAI X-ONE - Vercel Deployment Script${RESET}\n"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI is not installed.${RESET}"
    echo -e "Install it with: ${YELLOW}npm install -g vercel${RESET}"
    exit 1
fi

# Check if we're in the project root (where package.json is)
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Not in project root directory.${RESET}"
    echo -e "Please run this script from the root of the IKIGAI project."
    exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: No .env file found.${RESET}"
    echo -e "Creating from example..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}Created .env from .env.example${RESET}"
        echo -e "${YELLOW}Please edit .env with your actual credentials before deploying.${RESET}"
        exit 1
    else
        echo -e "${RED}Error: No .env.example file found.${RESET}"
        exit 1
    fi
fi

# Check for critical environment variables
echo -e "${BLUE}Checking environment variables...${RESET}"
source .env

REQUIRED_VARS=("OPENAI_API_KEY" "AUTH_USERNAME" "AUTH_PASSWORD")
MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${RESET}"
    for VAR in "${MISSING_VARS[@]}"; do
        echo -e "  - ${YELLOW}$VAR${RESET}"
    done
    echo -e "\nPlease set these variables in your .env file before deploying."
    exit 1
fi

# Ensure data directory exists
mkdir -p data

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo -e "${RED}Error: vercel.json not found.${RESET}"
    exit 1
fi

# Confirm deployment
echo -e "\n${YELLOW}Ready to deploy IKIGAI X-ONE to Vercel.${RESET}"
echo -e "This will deploy the application with the following configuration:"
echo -e "  - Authentication: ${BOLD}Enabled${RESET} (username: ${AUTH_USERNAME})"
echo -e "  - OpenAI Model: ${BOLD}${OPENAI_MODEL:-gpt-4o-mini}${RESET}"
echo -e "  - Image Generation: ${BOLD}${OPENAI_IMAGE_MODEL:-dall-e-3}${RESET} (${OPENAI_IMAGE_SIZE:-1792x1024})"

read -p "Continue with deployment? (y/n): " CONFIRM
if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo -e "${YELLOW}Deployment cancelled.${RESET}"
    exit 0
fi

# Deploy to Vercel
echo -e "\n${BLUE}Deploying to Vercel...${RESET}"
vercel --prod

# Check deployment status
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Deployment successful!${RESET}"
    echo -e "Your IKIGAI X-ONE application is now live on Vercel."
    echo -e "\n${YELLOW}Important:${RESET}"
    echo -e "1. Make sure to set environment variables in the Vercel dashboard"
    echo -e "2. The application is protected with HTTP Basic Auth"
    echo -e "   Username: ${AUTH_USERNAME}"
    echo -e "   Password: [hidden for security]"
    echo -e "3. Share only with the intended recipient - this is a single-user app"
else
    echo -e "\n${RED}Deployment failed.${RESET}"
    echo -e "Please check the error messages above and try again."
    exit 1
fi

echo -e "\n${BLUE}Thank you for using IKIGAI X-ONE!${RESET}"
