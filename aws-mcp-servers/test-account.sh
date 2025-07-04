#!/bin/bash

echo "🔍 Finding AWS Account Information..."
echo ""

# If you have AWS CLI configured with the secondary account credentials
echo "Option 1: Use AWS CLI profile"
echo "aws sts get-caller-identity --profile YOUR_PROFILE_NAME"
echo ""

# If you have the access key for the secondary account
echo "Option 2: Use temporary credentials"
echo "AWS_ACCESS_KEY_ID=aws_access_key_id AWS_SECRET_ACCESS_KEY=your_secret aws sts get-caller-identity"
echo ""

# Test current account
echo "Current account information:"
aws sts get-caller-identity 2>/dev/null || echo "❌ AWS CLI not configured or credentials invalid"
echo ""

echo "✅ Once you have the 12-digit account ID, update backend/config/accounts.json" 