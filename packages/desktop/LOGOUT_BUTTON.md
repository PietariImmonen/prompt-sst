# Logout Button Implementation

## Overview
Added a logout button to the sidebar layout's navigation bar. The button is positioned at the bottom of the sidebar and allows users to log out of the application.

## Implementation Details

### Component Modified
- `packages/desktop/src/renderer/src/components/layout/sidebar-layout.tsx`

### Changes Made
1. **Import Added**: 
   - Added `LogOut` icon from `lucide-react`
   - Added `useAuth` hook from `@/hooks/use-auth`

2. **Function Component Update**:
   - Added `const auth = useAuth()` to the `AppSidebar` component to access the authentication context
   - Added a `SidebarMenuButton` at the bottom of the `SidebarFooter` section

3. **Logout Button Features**:
   - Uses the `LogOut` icon from Lucide React
   - Positioned as the last item in the sidebar footer
   - Full width button with left-aligned text
   - Click handler calls `auth.logout()` which:
     - Removes authentication data from local storage
     - Clears Replicache databases
     - Redirects user to the login page (`#/auth/login`)

### Button Placement
The logout button is placed at the very bottom of the sidebar, after the prompt palette and prompt capture buttons, ensuring it's easily accessible but doesn't interfere with primary navigation.

### Styling
- Uses the existing `SidebarMenuButton` component for consistent styling
- Follows the same design language as other sidebar items
- Includes proper spacing and visual hierarchy

## Technical Details
- The logout functionality leverages the existing `logout` method from the `AuthProvider`
- No additional dependencies were required
- The implementation follows the established patterns in the codebase
- Proper React hooks usage with `useAuth` at the component level rather than inside event handlers

## User Experience
- Clear visual indication with the logout icon
- Consistent placement at the bottom of the navigation
- Immediate feedback through page redirect to login screen
- Maintains the overall aesthetic of the sidebar