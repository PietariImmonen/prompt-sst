# Desktop User and Organization Onboarding - Manual Verification

## Prerequisites
- Desktop application built and running
- Access to a test account or ability to create a new account

## Verification Steps

### 1. New User Registration Flow
1. Open the desktop application
2. Click on "Sign Up" or "Register" option
3. Choose Google authentication method
4. Complete the Google OAuth flow
5. Verify that the user is redirected to the `/onboarding` route
6. Verify that the onboarding page is displayed with the auto-capture toggle

### 2. Onboarding Page Functionality
1. On the onboarding page, verify that:
   - The title "Welcome to Prompt" is displayed
   - The description "Let's set up your workspace" is displayed
   - There is a toggle switch for "Auto-capture prompts"
   - The toggle has the description "Automatically capture prompts from your AI applications"
   - There is a "Continue" button

2. Test the toggle functionality:
   - Click the toggle switch to turn it on
   - Verify that the toggle state changes visually
   - Click the toggle switch again to turn it off
   - Verify that the toggle state changes back

### 3. Completing Onboarding
1. Ensure the auto-capture toggle is in the desired state (on or off)
2. Click the "Continue" button
3. Verify that:
   - The user is redirected to the main application (`/sessions` route)
   - The user settings are updated with `inAppOnboardingCompleted: true`
   - The application functions normally after onboarding

### 4. Returning User Experience
1. Close and reopen the desktop application
2. Log in with the same account
3. Verify that:
   - The user is NOT redirected to the onboarding page
   - The user is directly taken to the main application
   - The previously set auto-capture preference is maintained

## Expected API Behavior
- The `/account/complete-registration` endpoint should:
  - Create a new workspace with a name based on the user's name (e.g., "John Doe's Workspace")
  - Create a new user record associated with that workspace
  - Create user settings with default values and `inAppOnboardingCompleted: false`
  - Return the created user and workspace information

## Edge Cases to Test
1. Network failure during registration completion
2. Invalid token during registration completion
3. User closing the app during onboarding and returning later
4. Multiple rapid registrations from the same account