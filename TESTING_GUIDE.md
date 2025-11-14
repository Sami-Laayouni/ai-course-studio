# Testing Guide: Activity Player & Preview Flow

## 🚀 Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Access the application:**
   - Open http://localhost:3000 in your browser
   - Log in with your teacher account

## 📋 Step-by-Step Testing Instructions

### Test 1: Access the Activity Builder

1. Navigate to the Dashboard: `/dashboard`
2. Click on a course (or create one if none exists)
3. Click on a lesson (or create one if none exists)
4. On the lesson edit page, click **"Create Activity"** button
5. The `SimpleZapierBuilder` should open in full-screen mode

### Test 2: Create a Test Activity with Quiz Node

1. In the Activity Builder sidebar, you should see node types (Start, End, Video, Quiz, etc.)
2. **Drag a "Start" node** onto the canvas
3. **Drag a "Quiz" node** onto the canvas
4. **Drag an "End" node** onto the canvas

5. **Connect the nodes:**
   - Click the "+" button on the Start node
   - Select the Quiz node to connect
   - Click the "+" button on the Quiz node
   - Select the End node to connect

6. **Click on the Quiz node** to select it
7. In the right sidebar (Settings tab), configure:
   - **Title**: "Math Quiz"
   - **Description**: "Test your knowledge"
   - **Question Type**: "Multiple Choice"
   - Click **"Add Question"** button
   - Fill in:
     - Question: "What is 2 + 2?"
     - Options: "3", "4", "5", "6"
     - Correct Answer: Select "4" from dropdown
     - Explanation: "2 + 2 equals 4"
   - Add another question:
     - Question: "What is the capital of France?"
     - Options: "London", "Berlin", "Paris", "Madrid"
     - Correct Answer: Select "Paris"
     - Explanation: "Paris is the capital city of France"

8. **Set Activity Title** in the left sidebar:
   - Activity Title: "Test Activity"
   - Description: "Testing the activity player"

### Test 3: Test Preview Flow Button

1. With at least 2 nodes on the canvas (Start + Quiz), you should see a **"Preview Flow"** button in the top toolbar (next to Cancel)
2. Click **"Preview Flow"** button
3. A modal should open showing the Activity Player in preview mode
4. You should see:
   - A yellow/amber banner saying "Preview Mode"
   - The activity title and description
   - Progress bar
   - The Start node card

5. **Test the flow:**
   - The Start node should be visible
   - Click through to reach the Quiz node
   - The Quiz node should show your 2 questions
   - Questions should display as multiple choice with radio buttons

### Test 4: Test MCQ Rendering & Answer Submission

1. In the Preview Flow modal, navigate to the Quiz step
2. You should see:
   - Question numbers (1, 2)
   - Question text
   - Radio button options for each question
   - Submit button (disabled until all questions are answered)

3. **Test answering:**
   - Select "4" for question 1
   - Select "Paris" for question 2
   - The "Submit Answers" button should become enabled
   - Click **"Submit Answers"**

4. **Verify feedback:**
   - Question 1 with "4" selected should show:
     - Green border/background
     - ✓ checkmark icon
     - Green box with "✓ Correct! Well done."
     - Your explanation text
   - Question 2 with "Paris" selected should show similar feedback
   - At the bottom, you should see a score badge (e.g., "100%")

5. **Test incorrect answers:**
   - Close the Preview Flow modal
   - Click "Preview Flow" again to restart
   - Answer question 1 with "3" (wrong answer)
   - Answer question 2 with "London" (wrong answer)
   - Submit and verify:
     - Red border/background on wrong selections
     - ✗ icon on wrong answers
     - Correct answer should still be highlighted in green
     - Score should show 0%

### Test 5: Test Other Question Types

1. Close Preview Flow
2. Select the Quiz node again
3. Change **Question Type** to "True/False"
4. Add a True/False question:
   - Question: "The sky is blue"
   - Correct Answer: "True"
   - Explanation: "Yes, the sky appears blue due to Rayleigh scattering"

5. Click "Preview Flow" again
6. Test the True/False question rendering and scoring

### Test 6: Test UI Improvements

**In the Builder:**
- ✅ Node boxes should be wider and tidier
- ✅ Icons should be clearer with shadows
- ✅ Selected nodes should have a blue ring
- ✅ Branching toggles should only appear for AI Chat and Quiz nodes
- ✅ Node descriptions should show in the node boxes

**In the Player:**
- ✅ Progress bar should be visible
- ✅ Score badges should show total points
- ✅ Completed steps should have checkmarks
- ✅ Quiz feedback should be color-coded (green/red)
- ✅ Question numbers should be in circular badges

### Test 7: Test After Saving

1. Fill in Activity Title and Description
2. Click **"Complete & Get URL"** button (orange button)
3. Wait for the activity to be saved
4. Once saved, you should see:
   - A "Preview" button (opens in new tab/iframe)
   - The "Preview Flow" button should still work
5. Test both preview methods

## 🐛 Common Issues & Troubleshooting

### Issue: Preview Flow button not appearing
- **Solution**: Make sure you have at least 2 nodes (e.g., Start + Quiz)

### Issue: Quiz questions not showing
- **Solution**: 
  - Make sure you added questions to the Quiz node
  - Click on the Quiz node and check the Questions section
  - Ensure questions have question text and options filled in

### Issue: Submit button disabled
- **Solution**: Make sure all questions have answers selected

### Issue: No scoring feedback
- **Solution**: Make sure you click "Submit Answers" after selecting all answers

## 📝 Test Checklist

- [ ] Preview Flow button appears with 2+ nodes
- [ ] Preview Flow modal opens correctly
- [ ] Preview Mode banner shows in player
- [ ] MCQ questions render with radio buttons
- [ ] Multiple questions display correctly
- [ ] Submit button enables when all answered
- [ ] Correct answers show green feedback
- [ ] Incorrect answers show red feedback
- [ ] Score percentage displays after submission
- [ ] True/False questions work
- [ ] Node boxes look clean and organized
- [ ] Icons are clear and properly styled
- [ ] Selected nodes have blue ring
- [ ] Activity saves and can be previewed in saved mode

## 🎯 Direct Test URLs

If you want to test the player directly (without builder):
- Create an activity first using the builder
- Save it
- Access: `/learn/activities/[activity-id]`

## 💡 Tips

- Use browser DevTools (F12) to check console for any errors
- Check the Network tab if preview isn't loading
- Make sure your database is set up if testing saved activities
- The Preview Flow works without saving, making it great for testing

