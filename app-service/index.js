import { launchApp } from "@zos/router";

const globalData = getApp()._options.globalData;

AppService({
    onInit(params) {
        // Detect task alarms (params start with "task_")
        if (params && params.startsWith('task_')) {
            // Store params for popup page
            globalData.localStorage.setItem('pending_task_alarm', params);

            // Launch task reminder popup
            launchApp({
                appId: 1023438,  // Tasks NC app ID
                url: 'page/amazfit/TaskReminderPopup',
                params: params
            });
        }
    }
});
