import { getDeviceInfo } from "@zos/device";
import hmUI from "@zos/ui";
import * as timer from "@zos/timer";
import { back, launchApp } from "@zos/router";
import { setLayerScrolling } from "@zos/page";

const info = getDeviceInfo();
const _events = {}
const _evMapping = {
	"up": 1,    // hmApp.gesture.UP
	"left": 3,  // hmApp.gesture.LEFT
	"right": 4, // hmApp.gesture.RIGHT
	"down": 2,  // hmApp.gesture.DOWN
}

export class AppGesture {
	/**
	 * Register this instance. Must be called in onInit
	 */
	static init() {
		// In API 3.0, gesture registration is done via page config or onGesture
		// This is a compatibility shim
	}

	/**
	 * Add event listener, ex. AppGesture.on("left", () => {...})
	 */
	static on(event, action) {
		_events[_evMapping[event]] = action;
	}

	static withHighLoadBackWorkaround() {
		AppGesture.on("right", () => {
			setLayerScrolling(false);
			hmUI.createWidget(hmUI.widget.FILL_RECT, {
				x: 0,
				y: 0,
				w: info.width,
				h: info.height,
				color: 0x0
			});
			timer.createTimer(350, 0, () => back());
			return true;
		})
	}

	/**
	 * Reload page after two swipes in selected direction
	 */
	static withYellowWorkaround(event, startReq) {
		let lastSwipe = 0;
		let count = 0;
		AppGesture.on(event, () => {
			if(Date.now() - lastSwipe > 1000)
				count = 1;

			if(count == 3) {
				console.log("Reloading with params", startReq);
				launchApp(startReq);
				return;
			}

			count++;
			lastSwipe = Date.now();
			return true;
		});
	}
}