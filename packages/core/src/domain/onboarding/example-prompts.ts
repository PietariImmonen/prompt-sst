import type { UserRole } from "./role-tags";

export interface ExamplePrompt {
  title: string;
  content: string;
  tagNames: string[];
}

// Role-based example prompts that showcase the tag system
export const ROLE_EXAMPLE_PROMPTS: Record<UserRole, ExamplePrompt> = {
  "Software Engineer": {
    title: "Help me debug this React component",
    content: `I'm working on a React component that's supposed to fetch and display user data, but it's causing an infinite re-render loop. Here's the component:

\`\`\`jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  });
  
  return <div>{user?.name}</div>;
}
\`\`\`

Can you help me identify what's causing the infinite loop and how to fix it?`,
    tagNames: ["debugging", "frontend", "react"],
  },

  "Product Manager": {
    title: "Create user story for new feature",
    content: `Help me write a comprehensive user story for a new notification settings feature. The feature should allow users to customize which types of notifications they receive (email, push, in-app) and set quiet hours.

Include:
- User story format (As a... I want... So that...)
- Acceptance criteria
- Edge cases to consider
- Potential metrics to track`,
    tagNames: ["feature-request", "requirements", "planning"],
  },

  Designer: {
    title: "Design system color palette guidance",
    content: `I'm creating a design system for a fintech application that needs to convey trust and professionalism while remaining modern and accessible. 

Can you suggest:
- A primary color palette (5-6 colors)
- Semantic color assignments (success, warning, error, info)
- Accessibility considerations for text contrast
- How to implement dark mode variants`,
    tagNames: ["ui-design", "branding", "accessibility"],
  },

  "Data Scientist": {
    title: "Feature engineering for churn prediction",
    content: `I'm building a customer churn prediction model for a subscription-based SaaS product. I have access to:
- User activity logs
- Payment history
- Support ticket data
- Feature usage metrics

What are the most important features I should engineer for this use case? Please suggest specific feature ideas and explain why they might be predictive of churn.`,
    tagNames: ["modeling", "analysis", "machine-learning"],
  },

  "Marketing Manager": {
    title: "Q4 email campaign strategy",
    content: `Help me develop a comprehensive email marketing strategy for our Q4 product launch. The product is a B2B project management tool targeting teams of 10-50 people.

I need:
- Campaign structure (number of emails, timing)
- Subject line ideas
- Key messaging themes
- Segmentation strategy
- Success metrics to track`,
    tagNames: ["campaign", "content-strategy", "planning"],
  },

  "Content Writer": {
    title: "Blog post outline: AI productivity tools",
    content: `I need to write a comprehensive blog post about "How AI-Powered Tools Are Transforming Knowledge Work in 2025"

Target audience: Knowledge workers and team leads
Word count: 2000-2500 words
Goal: Educational content with practical examples

Please help me create a detailed outline including:
- Hook and introduction
- Main sections with subheadings
- Key points to cover in each section
- Conclusion and call-to-action`,
    tagNames: ["blog-post", "outline", "research"],
  },

  Student: {
    title: "Explain photosynthesis for my biology exam",
    content: `I have a biology exam coming up and I'm struggling to understand the complete process of photosynthesis. 

Can you explain:
- The two main stages (light-dependent and light-independent reactions)
- What happens in each stage
- The key molecules involved (chlorophyll, ATP, NADPH, glucose)
- Why it's important for life on Earth

Please explain it in a way that's easy to understand but detailed enough for an exam.`,
    tagNames: ["study-notes", "exam-prep", "learning"],
  },

  Other: {
    title: "Plan a productive morning routine",
    content: `I want to create a more productive morning routine that sets me up for success throughout the day. I typically wake up at 6:30 AM and need to start work by 9:00 AM.

Help me design a routine that includes:
- Exercise or movement
- Healthy breakfast
- Time for planning/reflection
- Learning or reading
- Buffer time for unexpected things

Please suggest a realistic schedule with time allocations for each activity.`,
    tagNames: ["planning", "ideas", "reference"],
  },
};

/**
 * Get example prompt for a specific role
 */
export function getExamplePromptForRole(role: UserRole): ExamplePrompt {
  return ROLE_EXAMPLE_PROMPTS[role] || ROLE_EXAMPLE_PROMPTS.Other;
}
