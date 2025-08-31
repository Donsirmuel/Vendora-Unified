#!/usr/bin/env python3

import os

# Read the current Login.tsx file
login_path = "../trade-lane-pro/src/pages/Login.tsx"
with open(login_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Link import
if 'import { Link }' not in content:
    # Find the useNavigate import and add Link
    content = content.replace(
        'import { useNavigate, useLocation } from "react-router-dom";',
        'import { Link, useNavigate, useLocation } from "react-router-dom";'
    )

# Replace the test credentials section with signup and password reset links
old_section = '''              <div className="mt-6 text-center">  
                <p className="text-sm text-muted-foreground">
                  Test credentials: test@vendor.com / testpass123
                </p>     
              </div>'''

new_section = '''              <div className="mt-6 text-center space-y-3">  
                <div className="text-sm text-muted-foreground">
                  <Link to="/password-reset" className="font-medium text-primary hover:underline">
                    Forgot your password?
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-medium text-primary hover:underline">
                    Create one here
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Test credentials: test@vendor.com / testpass123
                </div>
              </div>'''

content = content.replace(old_section, new_section)

# Write the updated content back
with open(login_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Updated Login.tsx with signup and password reset links")
print("✅ The Login component now includes:")
print("   - Link to signup page")
print("   - Link to password reset page")
print("   - Uses email field (already correct)")
print("\nNext: Add routes to your React Router configuration")
