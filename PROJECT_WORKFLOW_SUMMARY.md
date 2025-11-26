# Project Workflow Summary

## 🎯 Overview

**AI Course Authoring Studio** is a comprehensive, AI-powered learning management system that enables teachers to create personalized, interactive learning experiences, and students to engage with adaptive, gamified content.

---

## 📋 1. Initial Setup & Installation

### Prerequisites
- Node.js 18+ (recommended: Node.js 20+)
- pnpm package manager
- Supabase account
- Google AI API key (for AI features)

### Setup Steps

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables** (`.env.local`)
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   ```

3. **Database Setup** (CRITICAL - Must be done first!)
   - Access Supabase Dashboard → SQL Editor
   - Run `scripts/006_fix_rls_policies.sql` (Quick Fix) OR
   - Run `scripts/000_reset_database.sql` (Complete Reset) OR
   - Run scripts in order: 001 → 002 → 003 → 004 → 005 → 006

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

---

## 🔐 2. Authentication & User Onboarding

### User Registration Flow

1. **Landing Page** (`/`)
   - User sees landing page with features
   - If logged in, redirects based on role:
     - Admin → `/admin`
     - Teacher → `/dashboard`
     - Student → `/learn`

2. **Sign Up** (`/auth/signup`)
   - User creates account with email/password
   - Selects role: `admin`, `teacher`, or `student`
   - Database trigger automatically creates profile in `profiles` table
   - Default role: `teacher` (if not specified)

3. **Login** (`/auth/login`)
   - Authenticated users redirected based on role
   - Session managed via Supabase Auth

### Role-Based Access Control

- **Admin**: Full system access (`/admin`)
- **Teacher**: Course creation & management (`/dashboard`)
- **Student**: Learning interface (`/learn`)

---

## 👨‍🏫 3. Teacher Workflow

### 3.1 Course Creation

**Path**: `/dashboard/courses/new`

1. **Create Course**
   - Fill in: Title, Description, Subject, Grade Level
   - Add Learning Objectives (array)
   - System generates unique 6-character join code
   - Course created with `is_published: false`

2. **Course Management** (`/dashboard/courses/[id]`)
   - View course details
   - Manage lessons
   - View enrollments
   - Access analytics

### 3.2 Lesson Building

**Path**: `/dashboard/courses/[id]/lessons/new`

1. **Create Lesson**
   - Basic info: Title, Description, Estimated Duration
   - Optional: Lesson Goal, Learning Objectives
   - Content source: Manual, PDF, URL, or AI-generated

2. **Visual Lesson Editor** (`/dashboard/courses/[id]/lessons/[id]/edit`)
   - Drag-and-drop activity builder (Zapier-style)
   - Connect activities in sequences
   - Add conditional logic
   - Real-time preview

### 3.3 Activity Creation

**Path**: Enhanced Activity Creator (Modal/Component)

**Activity Types Available:**

1. **AI Chat Activity**
   - Personalized tutoring with mastery tracking
   - Adaptive difficulty based on student performance
   - Phase progression: Instruction → Practice → Quiz → Mastery

2. **Video Activity**
   - YouTube integration
   - Interactive controls & checkpoints
   - Timestamped notes

3. **PDF Reading Activity**
   - Document viewer with annotations
   - Highlighting & bookmarks
   - Vocabulary support

4. **Quiz Activity**
   - Multiple question types (MCQ, T/F, Short Answer, Essay, Matching)
   - Adaptive difficulty
   - Progressive hints
   - Real-time feedback

5. **Game/Simulation Activity**
   - Interactive educational games
   - Scoring system
   - Engagement tracking

6. **Collaborative Activity**
   - Real-time group work
   - Peer review
   - Discussion forums

7. **Custom/Agentic Activity**
   - Visual flow builder
   - Custom nodes and connections
   - Conditional logic

### 3.4 Assignment Creation

**Path**: Enhanced Assignment Creator

1. **Multi-Step Wizard**
   - Select activities to include
   - Configure settings:
     - Due dates
     - Grading (auto/manual)
     - Group assignments
     - Peer review
   - Assign to students/groups

2. **Assignment Management**
   - Track student submissions
   - Review and grade
   - Provide feedback

### 3.5 Analytics & Monitoring

**Path**: `/dashboard/analytics`

1. **Student Progress Tracking**
   - Individual student performance
   - Concept mastery analysis
   - Activity completion rates

2. **Course Analytics**
   - Overall engagement metrics
   - Grade distribution
   - Time to completion

3. **AI-Powered Insights**
   - Identify struggling areas
   - Intervention recommendations
   - Content optimization suggestions

### 3.6 Invite Management

**Path**: `/dashboard/invites` or Invite Manager Component

1. **Course Invites**
   - Generate invite links/codes
   - Share with students
   - Track invite status

2. **Join Codes**
   - Course join codes (6 characters)
   - Lesson join codes (6 characters)
   - Students can join via `/join/course/[code]` or `/join/lesson/[code]`

---

## 👨‍🎓 4. Student Workflow

### 4.1 Enrollment

**Path**: `/join/course/[code]` or `/join/lesson/[code]`

1. **Join via Code**
   - Enter join code (course or lesson)
   - Automatically enrolled in course
   - Access granted to content

2. **Invite Links**
   - Click invite link
   - Auto-enroll in course

### 4.2 Learning Interface

**Path**: `/learn`

1. **Dashboard** (`/learn`)
   - View enrolled courses
   - See progress overview
   - Access assignments
   - View points & leaderboard

2. **Course View** (`/learn/courses/[id]`)
   - See all lessons and activities
   - Progress tracking per activity
   - Activity status indicators:
     - `not_started`
     - `in_progress`
     - `completed`
     - `failed`

### 4.3 Activity Completion

**Path**: `/learn/activities/[id]`

1. **Activity Player**
   - **Simple Activity Player**: For standard activities
   - **Agentic Activity Player**: For custom/flow-based activities
   - **Assignment Player**: For assignment submissions

2. **Activity Flow**
   - Start activity → Navigate through nodes/steps
   - Complete interactive elements
   - Submit responses
   - Receive feedback & points

3. **Progress Tracking**
   - Real-time status updates
   - Score calculation
   - Time tracking
   - Attempt tracking

### 4.4 AI Tutoring

**Path**: AI Chat Activity

1. **Personalized Learning**
   - Ask questions
   - Get AI-generated explanations
   - Adaptive difficulty adjustment

2. **Mastery Tracking**
   - Real-time concept assessment
   - Confidence scoring
   - Learning path recommendations

3. **Phase Progression**
   - Instruction phase
   - Practice phase
   - Quiz phase
   - Mastery achievement

### 4.5 Assignment Dashboard

**Path**: `/learn/assignments` or Assignment Dashboard Component

1. **View Assignments**
   - See all assigned work
   - Track due dates
   - Monitor completion status

2. **Submit Assignments**
   - Complete required activities
   - Submit responses
   - Upload documents (if required)

3. **Review Feedback**
   - View grades
   - Read teacher feedback
   - Track improvements

### 4.6 Gamification

1. **Points System**
   - Earn points for completing activities
   - Points based on:
     - Activity complexity
     - Performance
     - Completion time

2. **Leaderboards**
   - Real-time rankings
   - Course-level leaderboards
   - Activity-level leaderboards

3. **Achievements**
   - Badges for milestones
   - Streak tracking
   - Progress visualization

---

## 👨‍💼 5. Admin Workflow

**Path**: `/admin`

1. **System Management**
   - Database status monitoring
   - User management
   - Role fixes (`/admin/fix-roles`)
   - System health checks

2. **Database Administration**
   - View database status (`/admin/database-status`)
   - Run maintenance scripts
   - Monitor system performance

---

## 🔄 6. Data Flow & Architecture

### Database Schema

**Core Tables:**
- `profiles` - User profiles with roles
- `courses` - Course information
- `lessons` - Lesson content within courses
- `activities` - Individual learning activities
- `enrollments` - Student-course relationships
- `student_progress` - Activity completion tracking
- `assignments` - Assignment definitions
- `notifications` - User notifications
- `invite_links` - Invitation management

### API Endpoints

**Authentication:**
- `/api/auth/create-profile` - Create user profile
- `/api/auth/fix-profile-role` - Update user role

**Courses:**
- `/api/courses` - Create/list courses
- `/api/courses/[id]` - Course operations

**Lessons:**
- `/api/lessons` - Create/list lessons

**Activities:**
- `/api/activities` - Activity operations

**AI:**
- `/api/ai/generate-content` - Generate educational content
- `/api/ai/generate-activity` - Create custom activities
- `/api/ai-chat` - Personalized learning conversations

**Student Data:**
- `/api/student-points` - Points management
- `/api/leaderboard` - Real-time rankings

**Assignments:**
- `/api/assignments` - Assignment operations

**Invites:**
- `/api/invites/*` - Invitation management

### Real-Time Features

- **Supabase Realtime**: Live updates for:
  - Leaderboards
  - Student progress
  - Collaborative activities
  - Notifications

---

## 🎨 7. Key Features Summary

### AI Integration
- **Google AI (Gemini)**: Content generation, tutoring, adaptive learning
- **AI-Powered Analytics**: Insights and recommendations
- **Personalized Learning**: Adaptive difficulty and pacing

### Activity System
- **Visual Builder**: Drag-and-drop activity creation
- **Multiple Types**: AI Chat, Video, PDF, Quiz, Games, Collaborative
- **Flow-Based**: Conditional logic and branching
- **Progress Tracking**: Real-time status and analytics

### Gamification
- **Points System**: Reward-based learning
- **Leaderboards**: Competitive engagement
- **Achievements**: Milestone recognition

### Collaboration
- **Group Activities**: Real-time collaboration
- **Peer Review**: Student-to-student feedback
- **Discussion Forums**: Asynchronous communication

### Analytics
- **Student Progress**: Individual tracking
- **Concept Mastery**: Learning objective analysis
- **Engagement Metrics**: Participation and time tracking
- **AI Insights**: Recommendations and interventions

---

## 🔒 8. Security & Access Control

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies enforce role-based access
- Users can only access their own data or authorized content

### Authentication
- Supabase Auth for secure authentication
- JWT tokens for session management
- Role-based redirects

### Data Protection
- Encrypted storage
- Secure file uploads
- Privacy controls

---

## 📊 9. Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL SETUP                             │
│  1. Install dependencies                                     │
│  2. Configure environment variables                         │
│  3. Set up Supabase database (CRITICAL)                     │
│  4. Start development server                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 AUTHENTICATION & ONBOARDING                  │
│  Sign Up → Profile Creation → Role Assignment → Redirect   │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│   TEACHER FLOW   │              │   STUDENT FLOW   │
│                  │              │                  │
│ 1. Create Course │              │ 1. Join Course    │
│ 2. Build Lessons │              │ 2. View Content   │
│ 3. Add Activities │              │ 3. Complete       │
│ 4. Create Assign │              │    Activities     │
│ 5. Monitor       │              │ 4. Submit Assign │
│    Analytics     │              │ 5. Track Progress│
└──────────────────┘              └──────────────────┘
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA & ANALYTICS                          │
│  Progress Tracking → Points → Leaderboards → Insights       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 10. Development Workflow

### Local Development
1. Make code changes
2. Hot reload via Next.js
3. Test in browser
4. Check Supabase logs for database issues

### Testing Key Flows
1. **Teacher**: Create course → Add lesson → Add activity → Assign
2. **Student**: Join course → View content → Complete activity → Earn points
3. **Admin**: Monitor system → Fix roles → Check database

### Common Issues & Solutions
- **RLS Errors**: Run `006_fix_rls_policies.sql`
- **Auth Issues**: Check database setup and profile trigger
- **AI Not Working**: Verify Google AI API key
- **Missing Tables**: Run database migration scripts

---

## 📝 11. Key Files & Directories

**Routes:**
- `/app` - Next.js App Router pages
- `/app/dashboard` - Teacher interface
- `/app/learn` - Student interface
- `/app/admin` - Admin interface
- `/app/api` - API endpoints

**Components:**
- `/components/learning` - Activity components
- `/components/teacher` - Teacher tools
- `/components/student` - Student interfaces
- `/components/ui` - Reusable UI components

**Database:**
- `/scripts` - SQL migration scripts
- `/lib/supabase` - Supabase client setup

**AI Integration:**
- `/lib/genai.ts` - Google AI configuration
- `/app/api/ai/*` - AI endpoints

---

This workflow summary provides a complete overview of how the AI Course Authoring Studio operates from setup to daily usage by teachers, students, and administrators.



