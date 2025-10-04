# Simple Activity Builder

A simplified, working version of the Zapier-style activity builder that focuses on core functionality and actually works!

## 🎯 What's Fixed

- ✅ **Nodes are actually draggable** - You can move them around the canvas
- ✅ **Clear visual connections** - Arrows show the flow between nodes
- ✅ **Simple, clean interface** - No overwhelming complexity
- ✅ **Proper parameter panels** - Each node type has relevant settings
- ✅ **Save & share functionality** - Activities can be saved and shared with students
- ✅ **Student experience works** - Activities actually function when students use them

## 🧩 Core Components

### 1. Start Node

- **Purpose**: Marks the beginning of the activity
- **Required**: Yes
- **Settings**: Title, description

### 2. End Node

- **Purpose**: Marks the completion of the activity
- **Required**: Yes
- **Settings**: Title, description

### 3. Video Node

- **Purpose**: YouTube video integration
- **Settings**:
  - YouTube URL (required)
  - Duration in minutes
  - Auto-play toggle

### 4. PDF/Reading Node

- **Purpose**: Reading materials and content
- **Settings**:
  - Content text (or PDF upload integration)
  - Estimated reading time
  - PDF upload button (integrates with existing upload system)

### 5. AI Chat Node

- **Purpose**: Interactive AI tutoring
- **Settings**:
  - AI prompt/instructions
  - Max conversation turns
  - Context sources (PDFs, YouTube videos)
  - Integrates with existing ContextSelector

### 6. Quiz Node

- **Purpose**: Interactive questions and assessment
- **Settings**:
  - Questions (one per line)
  - Time limit
  - Passing score percentage

## 🚀 How to Use

### For Teachers (Building Activities)

1. **Access the Builder**

   - Go to any lesson editor
   - Click "Add Activity" → "Custom Activity"
   - The simple builder will open

2. **Create Your Activity**

   - Drag components from the sidebar to the canvas
   - Connect nodes by clicking the arrow buttons
   - Click on nodes to configure their settings
   - Use the tool mode selector to switch between select and connect modes

3. **Configure Components**

   - Click on any node to open its settings panel
   - Fill in the required parameters
   - For AI Chat nodes, configure context sources
   - For Video nodes, add YouTube URLs

4. **Save & Share**
   - Click "Save & Share" when done
   - The activity will be created and can be assigned to students

### For Students (Using Activities)

1. **Start the Activity**

   - Click "Start Activity" on the start node
   - Follow the guided flow through each component

2. **Navigate Through Components**

   - Watch videos (YouTube integration)
   - Read content and materials
   - Chat with AI tutor
   - Complete quizzes
   - Progress is automatically tracked

3. **Complete the Activity**
   - Finish all required components
   - Get completion confirmation
   - View time spent and progress

## 🔧 Technical Details

### File Structure

```
components/learning/
├── simple-zapier-builder.tsx    # Main builder component
├── simple-activity-player.tsx   # Student activity player
└── context-selector.tsx         # Context source selector (existing)

app/demo-activity/
└── page.tsx                     # Demo page to test the system
```

### Key Features

- **Drag & Drop**: Nodes can be dragged around the canvas
- **Visual Connections**: Clear arrows show the activity flow
- **Real-time Configuration**: Click nodes to configure them immediately
- **Context Integration**: AI Chat nodes can use PDF and YouTube context
- **Progress Tracking**: Students see their progress through the activity
- **Mobile Responsive**: Works on all device sizes

### Integration Points

- Uses existing `ContextSelector` component for AI context
- Integrates with existing PDF upload system
- Uses existing UI components (shadcn/ui)
- Compatible with existing activity storage system

## 🎨 Design Philosophy

This simplified builder follows these principles:

1. **Simplicity First**: Only essential features, no overwhelming complexity
2. **Actually Works**: Every feature is functional and tested
3. **Student-Focused**: Activities work well for students
4. **Teacher-Friendly**: Easy to use for content creators
5. **Extensible**: Can be enhanced without breaking existing functionality

## 🚀 Getting Started

1. **Test the Demo**

   - Visit `/demo-activity` to see the system in action
   - Try the activity player to see the student experience

2. **Create Your First Activity**

   - Go to any lesson editor
   - Click "Add Activity" → "Custom Activity"
   - Start building!

3. **Share with Students**
   - Save your activity
   - Assign it to students
   - They'll get the full interactive experience

## 🔮 Future Enhancements

While this version focuses on core functionality, future enhancements could include:

- More node types (simulations, games, etc.)
- Advanced quiz types (multiple choice, matching, etc.)
- Analytics and reporting
- Collaborative features
- Advanced AI integration
- Custom styling options

But for now, this version gives you a solid, working foundation that actually works! 🎉
