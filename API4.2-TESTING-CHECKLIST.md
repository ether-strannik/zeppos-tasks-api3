# API 4.2 Full Testing Checklist

## Overview
Complete testing plan before merging SYSTEM_KEYBOARD and API 4.2 changes to main branch.

**Current Status**: API 4.2 with SYSTEM_KEYBOARD integrated
**Location**: `api3-test` directory
**Target**: Merge to main ZeppOS-Tasks after full validation

---

## 1. SYSTEM_KEYBOARD Testing

### ✅ New Task Creation
- [ ] Create new task in CalDAV list
  - [ ] T9 input works
  - [ ] Voice input works (microphone icon)
  - [ ] Emoji input works (smiley icon)
  - [ ] Numbers/symbols work
  - [ ] Cancel returns without creating
  - [ ] Empty text doesn't create task
  - [ ] Task appears in list after creation
  - [ ] No continuous loop issue

- [ ] Create new task in local list
  - [ ] Same tests as CalDAV above
  - [ ] Local list storage works

### ✅ Task Editing
- [ ] Edit task title
  - [ ] System keyboard opens with current title
  - [ ] T9/voice/emoji all work
  - [ ] Save updates title correctly
  - [ ] Cancel keeps original title
  - [ ] Empty title handled correctly

- [ ] Edit task notes
  - [ ] System keyboard opens with current notes
  - [ ] Multi-line notes work
  - [ ] Save updates notes correctly
  - [ ] Cancel keeps original notes

- [ ] Create subtask (CalDAV only)
  - [ ] System keyboard opens empty
  - [ ] Subtask created and appears in list
  - [ ] Empty title shows error
  - [ ] Cancel doesn't create subtask

---

## 2. Core Functionality Testing

### Task Management
- [ ] **Complete/Uncomplete tasks**
  - [ ] Toggle works on CalDAV tasks
  - [ ] Toggle works on local tasks
  - [ ] Syncs to server (CalDAV)
  - [ ] Persists locally (local lists)

- [ ] **Task priority**
  - [ ] Set priority (0-9)
  - [ ] Priority displays correctly
  - [ ] Priority syncs (CalDAV)

- [ ] **Task categories**
  - [ ] Assign category
  - [ ] Category displays with color
  - [ ] Category filter works

- [ ] **Task reminders/due dates**
  - [ ] Set due date
  - [ ] Set reminder time
  - [ ] Alarms trigger correctly
  - [ ] Date picker works

- [ ] **Delete tasks**
  - [ ] Delete confirmation works
  - [ ] Task removed from list
  - [ ] Syncs deletion (CalDAV)

### List Management
- [ ] **CalDAV lists**
  - [ ] Lists load from server
  - [ ] Switch between lists
  - [ ] Sync works bidirectionally
  - [ ] Subtasks display correctly
  - [ ] Task hierarchy maintained

- [ ] **Local lists**
  - [ ] Create/delete local lists
  - [ ] Tasks persist locally
  - [ ] No server sync (by design)
  - [ ] Subtasks work (if supported)

- [ ] **List picker**
  - [ ] Shows all lists (CalDAV first, then local)
  - [ ] Selection works
  - [ ] Filters correctly

---

## 3. CalDAV Sync Testing

### Server Communication
- [ ] **Initial sync**
  - [ ] Tasks download from server
  - [ ] All properties synced (title, notes, status, etc.)
  - [ ] Subtasks recognized correctly

- [ ] **Bidirectional sync**
  - [ ] Changes made on watch sync to server
  - [ ] Changes made on server appear on watch
  - [ ] No data loss or conflicts
  - [ ] Sync happens automatically

- [ ] **Special cases**
  - [ ] Tasks created in web app sync correctly
  - [ ] Subtasks from web app display as subtasks (not separate tasks)
  - [ ] RELATED-TO property parsed correctly
  - [ ] Categories/priorities match

---

## 4. UI/UX Testing

### Screens
- [ ] **HomeScreen**
  - [ ] Task list displays correctly
  - [ ] Priority rings aligned
  - [ ] Notes icons aligned
  - [ ] Category tags aligned
  - [ ] Scrolling works
  - [ ] Tap to toggle completion
  - [ ] Long press to edit

- [ ] **TaskEditScreen**
  - [ ] All edit options accessible
  - [ ] System keyboard for all text fields
  - [ ] Date/time pickers work
  - [ ] Priority picker works
  - [ ] Category picker works
  - [ ] Proper layout and spacing

- [ ] **SettingsScreen**
  - [ ] All settings accessible
  - [ ] CalDAV credentials work
  - [ ] Font size adjustment works
  - [ ] Theme settings work (if any)
  - [ ] About page accessible

- [ ] **TaskListPickerScreen**
  - [ ] Lists in correct order (CalDAV, then local)
  - [ ] Selection works
  - [ ] Create new list works

---

## 5. Voice Input Testing (Critical for API 4.2)

### Voice Recognition
- [ ] **New task via voice**
  - [ ] Microphone icon appears
  - [ ] Tap activates voice input
  - [ ] Speech recognition works
  - [ ] Text appears in field correctly
  - [ ] Can combine voice + manual input

- [ ] **Edit title via voice**
  - [ ] Same tests as above
  - [ ] Original text preserved when adding voice input

- [ ] **Edit notes via voice**
  - [ ] Voice input for multi-line notes
  - [ ] Punctuation recognized

- [ ] **Voice input edge cases**
  - [ ] Very long voice input
  - [ ] Special characters
  - [ ] Numbers spelled out vs digits
  - [ ] Multiple languages (if supported)

---

## 6. Device Compatibility

### Target Devices
- [ ] **Test on actual device** (if available)
  - Device model: __________
  - ZeppOS version: __________
  - Voice input works: [ ] Yes [ ] No

- [ ] **Test on simulator**
  - Simulator version: __________
  - All features work: [ ] Yes [ ] No

### API Compatibility
- [ ] **Check API 4.2 support**
  - [ ] Which devices support API 4.2?
  - [ ] Document minimum device requirements
  - [ ] Consider backwards compatibility plan

---

## 7. Performance & Stability

### Performance
- [ ] **App launch time**
  - [ ] Quick launch (< 2 seconds)
  - [ ] No lag or freezing

- [ ] **Task list scrolling**
  - [ ] Smooth scrolling with 50+ tasks
  - [ ] No frame drops

- [ ] **Keyboard responsiveness**
  - [ ] Keyboard opens quickly
  - [ ] No delay in character input
  - [ ] Voice input responsive

### Stability
- [ ] **No crashes**
  - [ ] Create 20+ tasks
  - [ ] Edit/delete tasks rapidly
  - [ ] Switch lists frequently
  - [ ] No memory leaks

- [ ] **Error handling**
  - [ ] Network errors handled gracefully
  - [ ] Invalid input handled
  - [ ] Empty states display correctly

---

## 8. Edge Cases & Bug Testing

### Known Issues
- [ ] **Previous loop issue** (FIXED)
  - [ ] Task creation no longer loops
  - [ ] Keyboard properly deleted

- [ ] **Icon alignment** (FIXED in main)
  - [ ] Verify fix still works in API 4.2
  - [ ] Priority rings centered
  - [ ] Notes icons centered

### New Edge Cases
- [ ] **Empty inputs**
  - [ ] Empty task title rejected
  - [ ] Empty notes allowed
  - [ ] Empty subtask rejected

- [ ] **Special characters**
  - [ ] Emojis display correctly
  - [ ] Unicode characters work
  - [ ] Special punctuation

- [ ] **Long text**
  - [ ] 500+ character task title
  - [ ] Very long notes
  - [ ] Text wrapping works

- [ ] **Rapid actions**
  - [ ] Tap multiple times quickly
  - [ ] Switch screens rapidly
  - [ ] No duplicate tasks created

---

## 9. Migration Preparation

### Code Review
- [ ] **Review all changes**
  - [ ] app.json API version change
  - [ ] NewNoteScreen SYSTEM_KEYBOARD
  - [ ] TaskEditScreen SYSTEM_KEYBOARD
  - [ ] No ScreenBoard references remain
  - [ ] All error handling in place

### Documentation
- [ ] **Update documentation**
  - [ ] CHANGELOG with API 4.2 upgrade
  - [ ] Note SYSTEM_KEYBOARD integration
  - [ ] Note voice input feature
  - [ ] Minimum device requirements

### Backup Plan
- [ ] **Keep API 3.0 version**
  - [ ] Tag current main as "api-3.0-stable"
  - [ ] Document rollback procedure
  - [ ] Consider dual-version support

---

## 10. Final Checks Before Merge

### Pre-Merge Checklist
- [ ] All critical tests passed
- [ ] No blocking bugs found
- [ ] Performance acceptable
- [ ] Voice input working
- [ ] CalDAV sync working
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Git commit message prepared

### Merge Plan
1. **Create feature branch** from main
2. **Copy changes** from api3-test:
   - app.json (API version)
   - NewNoteScreen.js
   - TaskEditScreen.js
   - Any other modified files
3. **Test again** on main branch
4. **Create pull request** (if using GitHub workflow)
5. **Merge to main**
6. **Tag release** (e.g., v2.0-api4.2)

---

## Issues Found

### Critical Issues
_(List any critical bugs that block release)_

- None yet

### Minor Issues
_(List any minor bugs or improvements needed)_

- None yet

### Known Limitations
_(List any features that don't work in API 4.2)_

- TBD: Device compatibility list

---

## Sign-off

- [ ] All tests completed
- [ ] All critical issues resolved
- [ ] Ready for production use
- [ ] Ready to merge to main branch

**Tested by**: ___________
**Date**: ___________
**Notes**: ___________
