import {SettingsBody} from "../lib/mmk/setting/Layout";
import {AccountTab} from "./tabs/AccountTab";

AppSettingsPage({
  build(ctx) {
    // Trigger Side-Service to start
    const nowTag = (new Date()).toISOString().substring(0, 19);
    if(ctx.settingsStorage.getItem("now") !== nowTag) ctx.settingsStorage.setItem("now", nowTag);

    // Build UI root
    return SettingsBody([
      AccountTab(ctx),
    ]);
  },
})
