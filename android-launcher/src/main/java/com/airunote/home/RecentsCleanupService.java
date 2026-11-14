package com.airunote.home;

import android.accessibilityservice.AccessibilityService;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Toast;

public final class RecentsCleanupService extends AccessibilityService {
    private static final String REALME_RECENTS = "com.android.launcher3";
    private static final String CLEAR_ALL_ID = REALME_RECENTS + ":id/recents_clear_all_btn";
    private static RecentsCleanupService connected;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private long deadline;

    static boolean start() {
        if (connected == null) return false;
        connected.openRecents();
        return true;
    }

    @Override protected void onServiceConnected() {
        connected = this;
    }

    private void openRecents() {
        cancelCleanup();
        if (!performGlobalAction(GLOBAL_ACTION_RECENTS)) {
            show(R.string.cleanup_recent_unavailable);
            return;
        }
        deadline = SystemClock.uptimeMillis() + 2200;
        handler.postDelayed(check, 250);
    }

    private final Runnable check = new Runnable() {
        @Override public void run() {
            if (deadline == 0) return;
            if (SystemClock.uptimeMillis() >= deadline) {
                cancelCleanup();
                show(R.string.cleanup_manual);
                return;
            }
            if (clickRealmeClearAll()) {
                cancelCleanup();
                show(R.string.cleanup_requested);
            } else {
                handler.postDelayed(this, 140);
            }
        }
    };

    private boolean clickRealmeClearAll() {
        AccessibilityNodeInfo window = getRootInActiveWindow();
        if (window == null || !REALME_RECENTS.contentEquals(window.getPackageName())) return false;
        for (AccessibilityNodeInfo node : window.findAccessibilityNodeInfosByViewId(CLEAR_ALL_ID)) {
            if (node.isVisibleToUser() && node.isEnabled() && node.isClickable()) {
                return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
        }
        return false;
    }

    private void show(int message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private void cancelCleanup() {
        deadline = 0;
        handler.removeCallbacks(check);
    }

    @Override public void onAccessibilityEvent(AccessibilityEvent event) { }
    @Override public void onInterrupt() { cancelCleanup(); }

    @Override public void onDestroy() {
        cancelCleanup();
        if (connected == this) connected = null;
        super.onDestroy();
    }
}
