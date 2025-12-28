# SYSTEM_KEYBOARD Integration Test

## Changes Made

### 1. API Version Upgrade
**File**: `app.json`
- **Before**: API 3.0
- **After**: API 4.0 (compatible), 4.2 (target)

### 2. NewNoteScreen Integration
**File**: `page/amazfit/NewNoteScreen.js`

**Replaced**: ScreenBoard (custom implementation)
**With**: SYSTEM_KEYBOARD (native ZeppOS keyboard)

**Changes:**
```javascript
// OLD
import {ScreenBoard} from "../../lib/mmk/ScreenBoard";
this.board = new ScreenBoard();
this.board.visible = true;

// NEW
import { createKeyboard, deleteKeyboard, inputType } from "@zos/ui";
this.keyboard = createKeyboard({
  inputType: inputType.CHAR,  // T9 keyboard with voice support
  onComplete: (keyboardWidget, result) => {
    this.doCreateTask(result.data);
  },
  onCancel: () => {
    deleteKeyboard();
    back();
  }
});
```

## Features Enabled

With `inputType.CHAR`, users get:
- ✅ **T9 Keyboard** - Multi-tap character input
- ✅ **Voice Input** - Speak to enter text
- ✅ **Numbers** - Switch to number mode
- ✅ **Emoji** - Emoji picker
- ✅ **Symbols** - Special characters

All with the native ZeppOS UI shown in the documentation!

## Testing

1. **Build the project:**
   ```bash
   zeus build
   # Select target device
   ```

2. **Test new note creation:**
   - Navigate to create a new note/task
   - The system keyboard should appear (like the image in the docs)
   - Test T9 input
   - Test voice input (microphone icon)
   - Test emoji (smiley icon)
   - Press checkmark to create task
   - Swipe right or back button to cancel

3. **Expected behavior:**
   - Professional native keyboard UI
   - Voice input works (if device supports it)
   - Text gets saved to task correctly
   - Cancel returns without creating task

## Device Compatibility

**API 4.2 Support:**
- Check which devices support API 4.2
- Devices on API 3.x won't be able to run this version
- May need to maintain two versions if older devices are still supported

## Next Steps

If this works well:

1. **Update TaskEditScreen** - Replace ScreenBoard for:
   - Title editing
   - Notes editing
   - Subtask creation

2. **Test on real device** - Verify voice input works

3. **Consider backwards compatibility**:
   - Keep API 3.0 version for older watches
   - Use API 4.2 version for newer watches with better keyboard

## Potential Issues

- **API compatibility**: Some devices may not support API 4.2 yet
- **Voice input**: May not work on all devices or require permissions
- **Build errors**: API changes may break some existing code

## Rollback Plan

If issues occur:
```bash
git checkout app.json page/amazfit/NewNoteScreen.js
```

This reverts to API 3.0 with ScreenBoard.
