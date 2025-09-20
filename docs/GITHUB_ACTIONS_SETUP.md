# GitHub Actions Setup Guide

## Table of Contents
- [Overview](#overview)
- [Workflow Files](#workflow-files)
- [Features by Tier](#features-by-tier)
- [Billing Considerations](#billing-considerations)
- [Troubleshooting](#troubleshooting)
- [Configuration](#configuration)

## Overview

This project uses GitHub Actions for comprehensive CI/CD automation. The workflows are designed to work with both free and paid GitHub tiers.

## Workflow Files

### Core Workflows (Free Tier)
These workflows work on all GitHub accounts:

1. **ci.yml** - Main CI pipeline
   - Linting and code quality checks
   - TypeScript compilation
   - Unit tests (currently disabled)
   - Build verification
   - MCP protocol validation

2. **integration-tests.yml** - Integration testing
   - Cross-platform testing
   - API connectivity tests
   - Performance benchmarks

3. **release.yml** - Release automation
   - Semantic versioning
   - Changelog generation
   - GitHub Release creation
   - Asset uploads

4. **dependency-update.yml** - Dependency management
   - Automated npm updates
   - Security patch updates
   - Lock file maintenance

5. **performance.yml** - Performance monitoring
   - Bundle size tracking
   - Memory usage analysis
   - Response time benchmarks

### Premium Workflows (Paid Features)
These require GitHub Team/Enterprise or specific permissions:

1. **security.yml** - Security scanning
   - CodeQL analysis (requires GitHub Advanced Security)
   - OWASP dependency checking
   - Container scanning
   - SAST/DAST scans

2. **docker.yml** - Container management
   - Multi-platform builds
   - GitHub Container Registry push
   - Vulnerability scanning

## Features by Tier

### Free Tier Features
- ✅ 2,000 minutes/month for private repos
- ✅ Unlimited for public repos
- ✅ Basic CI/CD workflows
- ✅ Artifact storage (500 MB)
- ✅ GitHub Container Registry (limited)

### Paid Tier Features
- ✅ CodeQL security analysis
- ✅ Advanced security features
- ✅ Larger runners and concurrency
- ✅ Extended artifact storage
- ✅ Container scanning

## Billing Considerations

### Common Billing Issues

If you see errors like:
```
The job was not started because your account is locked due to a billing issue.
```

This typically means:
1. **Private Repository**: You've exceeded the free tier minutes (2,000/month)
2. **Payment Issue**: Credit card or billing problem on paid account
3. **Feature Restriction**: Attempting to use paid features on free tier

### Solutions

1. **Make Repository Public**
   - Public repos get unlimited GitHub Actions minutes
   - Most features become free for open source

2. **Disable Premium Features**
   - Set environment variables to skip premium jobs:
   ```yaml
   env:
     SKIP_CODEQL: true
     SKIP_DOCKER: true
     SKIP_SECURITY_SCAN: true
   ```

3. **Upgrade GitHub Plan**
   - GitHub Team: $4/user/month
   - GitHub Enterprise: $21/user/month
   - Includes advanced security features

4. **Use Alternative Services**
   - Snyk for security scanning (free tier available)
   - Docker Hub for container registry (free public repos)
   - SonarCloud for code quality (free for open source)

## Troubleshooting

### Workflow Syntax Errors

**hashFiles() function issues:**
```yaml
# Correct - when already in conditional
if: hashFiles('Dockerfile') != ''

# Incorrect - double wrapping
if: ${{ hashFiles('Dockerfile') != '' }}
```

**Environment variable access:**
```yaml
# At job level - use outputs
steps:
  - name: Check condition
    id: check
    run: echo "SKIP=${{ env.SKIP_TESTS }}" >> $GITHUB_OUTPUT

  - name: Use condition
    if: steps.check.outputs.SKIP != 'true'
```

### Disabled Features

Currently disabled for gradual implementation:
- Unit tests (SKIP_UNIT_TESTS=true)
- Coverage reports (SKIP_COVERAGE=true)

To enable:
1. Implement test suites
2. Update workflow environment variables
3. Ensure test scripts exist in package.json

## Configuration

### Repository Settings

1. **Enable GitHub Actions**
   - Settings → Actions → General
   - Allow all actions and workflows

2. **Configure Secrets**
   ```
   GITHUB_TOKEN - Automatically provided
   NPM_TOKEN - For npm publishing (optional)
   ```

3. **Set Permissions**
   - Settings → Actions → General → Workflow permissions
   - Read and write permissions
   - Allow GitHub Actions to create PRs

### Workflow Customization

Edit workflow files in `.github/workflows/` to:
- Adjust Node.js version (default: 22.x)
- Modify test thresholds
- Add/remove workflow triggers
- Configure caching strategies

### Running Locally

Test workflows locally with [act](https://github.com/nektos/act):
```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run specific workflow
act -W .github/workflows/ci.yml

# Run with secrets
act -W .github/workflows/release.yml --secret-file .env
```

## Best Practices

1. **Keep workflows DRY**
   - Use composite actions for repeated steps
   - Define shared environment variables

2. **Optimize for speed**
   - Use dependency caching
   - Run jobs in parallel
   - Use matrix builds sparingly

3. **Monitor usage**
   - Check Actions tab for minute usage
   - Review billing → Actions for costs
   - Set spending limits if needed

4. **Security**
   - Never commit secrets
   - Use GitHub Secrets for sensitive data
   - Review third-party actions

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Billing](https://docs.github.com/en/billing/managing-billing-for-github-actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [CodeQL Documentation](https://codeql.github.com/docs/)