# Multi-Account AWS Setup Guide

## 🚨 Important Note About Account IDs

**AWS Account IDs are 12-digit numbers** like `203180463038`.

The identifier `ASIA3BYGHJ4Y7NOK6LLO` looks like an **AWS Access Key ID**, not an account ID. 

## 📋 Step 1: Get the Correct Account ID

To find the actual account ID for your secondary account:

```bash
# Using AWS CLI with the credentials for that account
aws sts get-caller-identity --profile your-profile-name

# Or check in AWS Console → Account Settings
```

## 🔧 Step 2: Configure Multiple Accounts

Edit `backend/config/accounts.json`:

```json
{
  "accounts": {
    "203180463038": {
      "name": "KinvolvedPreProd",
      "environment": "pre-production",
      "region": "us-east-1",
      "description": "Kinvolved Pre-Production Environment"
    },
    "123456789012": {
      "name": "YourSecondAccount",
      "environment": "production",
      "region": "us-east-1",
      "description": "Replace with actual 12-digit account ID"
    }
  },
  "defaultName": "AWS Account"
}
```

## 🔐 Step 3: Set Up Cross-Account Access

### Option A: Cross-Account IAM Roles (Recommended)

1. **In each target account**, create a role named `CrossAccountAccessRole`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::203180463038:root"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

2. **Attach CloudFormation permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:List*",
        "cloudformation:Describe*",
        "cloudformation:Get*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Option B: Separate AWS Profiles

Configure AWS CLI profiles for each account:

```bash
# ~/.aws/config
[profile account1]
region = us-east-1
output = json

[profile account2]
region = us-east-1
output = json

# ~/.aws/credentials
[account1]
aws_access_key_id = YOUR_KEY_ID_1
aws_secret_access_key = YOUR_SECRET_1

[account2]
aws_access_key_id = YOUR_KEY_ID_2
aws_secret_access_key = YOUR_SECRET_2
```

## 🚀 Step 4: Test Configuration

1. **Test each account individually**:
```bash
# Test account access
curl "http://localhost:3002/api/aws/accounts" | jq '.'

# Test specific account stacks
curl "http://localhost:3002/api/aws/stacks?accountId=123456789012" | jq '.'
```

2. **Check backend logs** for any access errors:
```bash
npm run dev
# Look for messages like:
# ✅ Account 123456789012 accessible (10 stacks)
# ❌ Account 456789012345 not accessible: AssumeRole failed
```

## 🛠️ Step 5: Update Your Configuration

**Replace `ASIA3BYGHJ4Y7NOK6LLO` with the actual 12-digit account ID**:

```json
{
  "accounts": {
    "203180463038": {
      "name": "KinvolvedPreProd",
      "environment": "pre-production",
      "region": "us-east-1"
    },
    "YOUR_ACTUAL_ACCOUNT_ID": {
      "name": "SecondaryAccount",
      "environment": "production",
      "region": "us-east-1",
      "description": "Your second AWS account"
    }
  }
}
```

## 🔍 Troubleshooting

### Account ID Not Found
- **Error**: Account ID format is wrong
- **Fix**: Use 12-digit number, not access key ID

### AssumeRole Failed
- **Error**: `Cannot access account: AssumeRole failed`
- **Fix**: Create `CrossAccountAccessRole` in target account with trust policy

### No Permissions
- **Error**: `Access Denied` when listing stacks
- **Fix**: Attach CloudFormation read permissions to the assumed role

### Organizations API Failed
- **Info**: This is normal if not using AWS Organizations
- **Fix**: The system will fall back to config file mapping

## 📊 Expected Results

Once configured correctly, you'll see:

**Frontend Sidebar:**
```
AWS ACCOUNTS

✓ KinvolvedPreProd (203180463038) [20 stacks]
  └── CloudFormation Stacks
      ├── stack-1
      ├── stack-2
      └── ...

✓ SecondaryAccount (123456789012) [15 stacks]  
  └── CloudFormation Stacks
      ├── prod-stack-1
      ├── prod-stack-2
      └── ...
```

**API Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "203180463038",
      "name": "KinvolvedPreProd",
      "stackCount": 20,
      "accessible": true
    },
    {
      "id": "123456789012", 
      "name": "SecondaryAccount",
      "stackCount": 15,
      "accessible": true
    }
  ]
}
```

## 🎯 Next Steps

1. **Get the correct 12-digit account ID** for your secondary account
2. **Update `config/accounts.json`** with the real account ID
3. **Set up cross-account IAM roles** or separate AWS profiles
4. **Restart the backend** to see both accounts with their stacks
5. **Test in the frontend** - you should see multiple expandable accounts

## 💡 Pro Tips

- Use **AWS Organizations** for automatic account discovery
- Set up **CloudTrail** to monitor cross-account access
- Consider **AWS Control Tower** for enterprise multi-account management
- Use **least privilege** IAM policies for security 