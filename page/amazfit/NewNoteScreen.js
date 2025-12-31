import { setStatusBarVisible, createKeyboard, deleteKeyboard, inputType } from "@zos/ui";
import { back, replace } from "@zos/router";
import {createSpinner} from "../Utils";
import {ConfiguredListScreen} from "../ConfiguredListScreen";

const { t, config, tasksProvider } = getApp()._options.globalData

class NewNoteScreen extends ConfiguredListScreen {
  constructor(params) {
    super();

    // Handle undefined params gracefully
    if (params === undefined || params === "undefined" || !params) {
      // Fallback: read from config if push() didn't pass params (API 3.0 issue)
      const savedParams = config.get("_newNoteParams");
      if (savedParams) {
        this.params = savedParams;
        config.set("_newNoteParams", null); // Clear after use
      } else {
        // Fallback to current list from config
        this.params = {
          list: config.get("cur_list_id")
        };
      }
    } else {
      try {
        this.params = JSON.parse(params);
      } catch(e) {
        this.params = {};
      }
    }

    this.keyboard = null;
  }

  build() {
    // Create system keyboard with CHAR input type (T9 with voice support)
    this.keyboard = createKeyboard({
      inputType: inputType.CHAR,
      text: "",
      onComplete: (keyboardWidget, result) => {
        try { deleteKeyboard(); } catch (e) { /* ignore */ }
        this.doCreateTask(result.data);
      },
      onCancel: () => {
        try { deleteKeyboard(); } catch (e) { /* ignore */ }
        back();
      }
    });
  }

  doCreateTask(text) {
    if (!text || text.trim() === "") {
      back();
      return;
    }

    // Check if we're creating a local list instead of a task
    if (this.params.mode === "create_local_list") {
      const localLists = config.get("localLists", []);
      const nextId = config.get("next_local_list_id", 0);
      const newListId = `local:${nextId}`;

      const newList = {
        id: newListId,
        title: text.trim(),
        tasks: []
      };

      localLists.push(newList);

      config.update({
        localLists: localLists,
        next_local_list_id: nextId + 1,
        cur_list_id: newListId  // Auto-select new list
      });

      // Navigate directly to HomeScreen with the new local list
      replace({
        url: "page/amazfit/HomeScreen",
        param: JSON.stringify({ fromListPicker: true })
      });
      return;
    }

    // Regular task creation
    if (!this.params.list) {
      back();
      return;
    }

    createSpinner();

    try {
      const list = tasksProvider.getTaskList(this.params.list);

      if (!list) {
        back();
        return;
      }

      list.insertTask(text).then(() => {
        back();
      }).catch((error) => {
        back();
      });
    } catch (error) {
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
