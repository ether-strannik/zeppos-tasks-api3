import { setStatusBarVisible, createKeyboard, deleteKeyboard, inputType } from "@zos/ui";
import { back } from "@zos/router";
import {createSpinner} from "../Utils";
import {ConfiguredListScreen} from "../ConfiguredListScreen";

const { t, tasksProvider } = getApp()._options.globalData

class NewNoteScreen extends ConfiguredListScreen {
  constructor(params) {
    super();
    console.log(params);

    try {
      this.params = params ? JSON.parse(params) : {};
    } catch(e) {
      this.params = {};
    }
    this.keyboard = null;
  }

  build() {
    // Create system keyboard with CHAR input type (T9 with voice support)
    this.keyboard = createKeyboard({
      inputType: inputType.CHAR,
      text: "",  // Initial text
      onComplete: (keyboardWidget, result) => {
        console.log("Keyboard completed:", result.data);
        // Delete keyboard first to prevent loop
        try {
          deleteKeyboard();
        } catch (e) {
          console.log("Error deleting keyboard:", e);
        }
        this.doCreateTask(result.data);
      },
      onCancel: () => {
        console.log("Keyboard cancelled");
        try {
          deleteKeyboard();
        } catch (e) {
          console.log("Error deleting keyboard on cancel:", e);
        }
        back();
      }
    });
  }

  doCreateTask(text) {
    if (!text || text.trim() === "") {
      console.log("Empty text, going back");
      back();
      return;
    }

    console.log("Creating task with text:", text);
    createSpinner();

    try {
      const list = tasksProvider.getTaskList(this.params.list);
      list.insertTask(text).then(() => {
        console.log("Task created successfully");
        back();
      }).catch((error) => {
        console.log("Error creating task:", error);
        back();
      });
    } catch (error) {
      console.log("Error in doCreateTask:", error);
      back();
    }
  }
}

// noinspection JSCheckFunctionSignatures
Page({
  onInit(params) {
    setStatusBarVisible(false);
    new NewNoteScreen(params).build();
  }
})
