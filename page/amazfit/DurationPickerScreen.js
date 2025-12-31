import hmUI, { setStatusBarVisible, updateStatusBarTitle } from "@zos/ui";
import { replace, push, back } from "@zos/router";
import { TimePicker } from "../../lib/mmk/TimePicker";
import { createSnoozeAlarm } from "../../utils/app-reminder-manager";

const { config, t } = getApp()._options.globalData;

let timePicker = null;
let isProcessingSnooze = false; // Module-level guard against multiple page instances

Page({
    onInit(params) {
        try {
            params = (params && params !== "undefined") ? JSON.parse(params) : {};
        } catch(e) {
            params = {};
        }

        // Fallback: read from config if push() didn't pass params (API 3.0/4.0 issue)
        if (!params.taskUID || !params.taskTitle) {
            const savedParams = config.get("_durationPickerParams");
            if (savedParams) {
                params = savedParams;
                // Clear the saved params
                config.set("_durationPickerParams", null);
            }
        }

        this.mode = params.mode; // 'snooze'
        this.taskUID = params.taskUID;
        this.taskTitle = params.taskTitle;
        this.settings = params.settings || {};

        if (!this.taskUID || !this.taskTitle) {
            this.error = true;
            return;
        }

        setStatusBarVisible(true);
        updateStatusBarTitle("");
    },

    build() {
        if (this.error) {
            this.showError();
            return;
        }

        // Create TimePicker for duration selection
        timePicker = new TimePicker({
            initialHour: 0,
            initialMinute: 15,  // Default 15 minutes
            onSelect: (hour, minute) => {
                this.hour = hour;
                this.minute = minute;
            },
            onConfirm: () => {
                this.createSnooze();
            },
            onCancel: () => {
                if (isProcessingSnooze) return;
                isProcessingSnooze = true;
                replace({ url: 'page/amazfit/HomeScreen' });
            }
        });

        timePicker.render();
    },

    showError() {
        hmUI.createWidget(hmUI.widget.TEXT, {
            x: 0,
            y: 200,
            w: 480,
            h: 100,
            text: 'Error: Invalid parameters',
            text_size: 24,
            align_h: hmUI.align.CENTER_H,
            color: 0xFF0000
        });

        hmUI.createWidget(hmUI.widget.BUTTON, {
            x: 100,
            y: 320,
            w: 280,
            h: 60,
            radius: 30,
            normal_color: 0xFF0000,
            press_color: 0xCC0000,
            text: t('Close'),
            text_size: 24,
            click_func: () => replace({ url: 'page/amazfit/HomeScreen' })
        });
    },

    createSnooze() {
        // Module-level guard against multiple rapid calls (works across page instances)
        if (isProcessingSnooze) return;
        isProcessingSnooze = true;

        const hours = this.hour || 0;
        const minutes = this.minute || 0;
        const totalMinutes = (hours * 60) + minutes;

        if (totalMinutes === 0) {
            hmUI.showToast({ text: t('Please select a duration') });
            isProcessingSnooze = false;  // Allow retry
            return;
        }

        if (totalMinutes > 1440) {  // Max 24 hours
            hmUI.showToast({ text: t('Maximum 24 hours') });
            isProcessingSnooze = false;  // Allow retry
            return;
        }

        // Create snooze alarm
        const alarmId = createSnoozeAlarm(
            this.taskUID,
            this.taskTitle,
            totalMinutes,
            this.settings
        );

        if (alarmId) {
            const hoursText = hours > 0 ? `${hours}h ` : '';
            const minutesText = minutes > 0 ? `${minutes}m` : '';
            hmUI.showToast({ text: t(`Snoozed for ${hoursText}${minutesText}`) });
        } else {
            hmUI.showToast({ text: t('Failed to create alarm') });
        }

        // Return to HomeScreen
        replace({ url: 'page/amazfit/HomeScreen' });
    },

    onDestroy() {
        if (timePicker) {
            try {
                timePicker.destroy();
            } catch (e) {
                // Ignore errors
            }
        }
        // Reset module-level guard for next use
        isProcessingSnooze = false;
    }
});
