// Role-to-tag mapping configuration for onboarding

export const USER_ROLES = [
  "Software Engineer",
  "Product Manager",
  "Designer",
  "Data Scientist",
  "Marketing Manager",
  "Content Writer",
  "Student",
  "Other",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// Base tags that every workspace gets
export const BASE_TAGS = [
  "important",
  "draft",
  "reference",
  "follow-up",
  "archive",
];

// Role-specific tag mappings
export const ROLE_TAG_MAPPING: Record<UserRole, string[]> = {
  "Software Engineer": [
    "debugging",
    "code-review",
    "architecture",
    "frontend",
    "backend",
    "testing",
    "api",
    "database",
  ],
  "Product Manager": [
    "feature-request",
    "roadmap",
    "user-research",
    "metrics",
    "requirements",
    "stakeholder",
    "planning",
    "feedback",
  ],
  Designer: [
    "ui-design",
    "ux-research",
    "wireframe",
    "prototype",
    "branding",
    "accessibility",
    "user-flow",
    "feedback",
  ],
  "Data Scientist": [
    "analysis",
    "visualization",
    "modeling",
    "data-cleaning",
    "statistics",
    "machine-learning",
    "sql",
    "python",
  ],
  "Marketing Manager": [
    "campaign",
    "content-strategy",
    "social-media",
    "analytics",
    "seo",
    "copywriting",
    "audience",
    "metrics",
  ],
  "Content Writer": [
    "blog-post",
    "copywriting",
    "editing",
    "seo",
    "research",
    "outline",
    "headline",
    "social-media",
  ],
  Student: [
    "homework",
    "research",
    "study-notes",
    "essay",
    "project",
    "exam-prep",
    "learning",
    "questions",
  ],
  Other: ["project", "research", "planning", "notes", "ideas", "tasks"],
};

/**
 * Get all tags for a specific role (base tags + role-specific tags)
 */
export function getTagsForRole(role: UserRole): string[] {
  return [...BASE_TAGS, ...(ROLE_TAG_MAPPING[role] || [])];
}

/**
 * Validate if a string is a valid user role
 */
export function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}
