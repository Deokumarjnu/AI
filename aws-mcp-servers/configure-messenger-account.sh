#!/bin/bash

echo "🔧 Configure Messenger Account Profile"
echo "======================================"
echo ""

echo "Step 1: Get complete temporary credentials from AWS Console for account 759685402417"
echo "Go to: AWS Console → Your Name → Security Credentials → Create access key → CLI"
echo ""

echo "Step 2: Run these commands with your actual credentials:"
echo ""
echo "aws configure set aws_access_key_id 'YOUR_ACCESS_KEY_ID' --profile messenger-account"
echo "aws configure set aws_secret_access_key 'YOUR_SECRET_ACCESS_KEY' --profile messenger-account"
echo "aws configure set aws_session_token 'YOUR_SESSION_TOKEN' --profile messenger-account"
echo "aws configure set region 'us-east-1' --profile messenger-account"
echo ""

echo "Step 3: Test the profile:"
echo "aws sts get-caller-identity --profile messenger-account"
echo ""

echo "Step 4: Restart the backend:"
echo "cd backend && npm run dev"
echo ""

echo "🎯 Expected result: Account 759685402417 should show stacks instead of 0" 