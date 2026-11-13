package com.airunote.home;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.role.RoleManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.LauncherActivityInfo;
import android.content.pm.LauncherApps;
import android.content.res.Configuration;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Process;
import android.os.UserHandle;
import android.provider.Settings;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;

import java.text.Collator;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class HomeActivity extends Activity {
    private static final String AIRUNOTE = "https://www.airunote.com/login";
    private static final List<String> DEFAULT_PINS = Arrays.asList(
            "com.oplus.camera", "com.openai.chatgpt",
            "com.google.android.apps.messaging", "com.facebook.orca");
    private static final int MAX_PINS = 4;
    private static final int SET_HOME = 1;
    private static final String PIN_KEY = "home_pins";
    private static final String LEFT_KEY = "left_app";
    private static final String WORKSPACE_KEY = "airunote_workspace";
    private static final String HIDE_BARS_KEY = "hide_airunote_bars";
    private static final String NO_LEFT = "-";
    private static final String READ_BAR_COLORS = """
            (() => {
              const color = (y) => {
                for (const el of document.elementsFromPoint(innerWidth / 2, y)) {
                  const value = getComputedStyle(el).backgroundColor;
                  if (value.startsWith("rgb(")) return value;
                }
                return '';
              };
              return [color(2), color(innerHeight - 3)];
            })()
            """;
    private enum Screen { HOME, APPS, AIRUNOTE }

    private SharedPreferences prefs;
    private LauncherApps launcherApps;
    private final List<LauncherActivityInfo> apps = new ArrayList<>();
    private final Map<String, LauncherActivityInfo> byPackage = new HashMap<>();
    private FrameLayout root;
    private EditText search;
    private LinearLayout appRows;
    private WebView web;
    private FrameLayout webHost;
    private LinearLayout webError;
    private Screen screen = Screen.HOME;
    private int page, insetL, insetT, insetR, insetB;
    private boolean dark, moved, listening;
    private float downX, downY;
    private int bg, fg, muted, panel, accent;
    private int airunoteTop, airunoteBottom;
    private final Paint barPaint = new Paint();
    private final Runnable updateAirunoteBars = new Runnable() {
        @Override public void run() {
            if (screen != Screen.AIRUNOTE || web == null || !hasWindowFocus()) return;
            WebView current = web;
            current.evaluateJavascript(READ_BAR_COLORS, result -> {
                if (screen != Screen.AIRUNOTE || web != current) return;
                try {
                    JSONArray colors = new JSONArray(result);
                    int top = parseWebColor(colors.optString(0), airunoteTop);
                    int bottom = parseWebColor(colors.optString(1), airunoteBottom);
                    if (top == airunoteTop && bottom == airunoteBottom) return;
                    airunoteTop = top;
                    airunoteBottom = bottom;
                    root.invalidate();
                    WindowInsetsController bars = root.getWindowInsetsController();
                    if (bars != null) updateBarIconColors(bars);
                } catch (JSONException ignored) {
                    // The first frame may not have a document yet.
                }
            });
            root.postDelayed(this, 1200);
        }
    };
    private final LauncherApps.Callback appChanges = new LauncherApps.Callback() {
        @Override public void onPackageAdded(String p, UserHandle u) { refresh(); }
        @Override public void onPackageRemoved(String p, UserHandle u) { refresh(); }
        @Override public void onPackageChanged(String p, UserHandle u) { refresh(); }
        @Override public void onPackagesAvailable(String[] p, UserHandle u, boolean r) { refresh(); }
        @Override public void onPackagesUnavailable(String[] p, UserHandle u, boolean r) { refresh(); }
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("home", MODE_PRIVATE);
        launcherApps = getSystemService(LauncherApps.class);
        dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        bg = dark ? 0xff12141a : 0xfff8f9fd;
        fg = dark ? 0xfff0f2f8 : 0xff191b24;
        muted = dark ? 0xffb0b6c8 : 0xff545d72;
        panel = dark ? 0xff222633 : 0xffe9edf8;
        accent = dark ? 0xffbdc9ff : 0xff324ea6;
        airunoteTop = airunoteBottom = bg;

        getWindow().setDecorFitsSystemWindows(false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarDividerColor(Color.TRANSPARENT);
        getWindow().setStatusBarContrastEnforced(false);
        getWindow().setNavigationBarContrastEnforced(false);
        root = new FrameLayout(this) {
            @Override protected void onDraw(Canvas canvas) {
                super.onDraw(canvas);
                if (screen != Screen.AIRUNOTE || webFailed) return;
                barPaint.setColor(airunoteTop);
                canvas.drawRect(0, 0, getWidth(), insetT, barPaint);
                barPaint.setColor(airunoteBottom);
                canvas.drawRect(0, getHeight() - insetB, getWidth(), getHeight(), barPaint);
            }
        };
        root.setWillNotDraw(false);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            var bars = insets.getInsets(WindowInsets.Type.systemBars()
                    | WindowInsets.Type.displayCutout());
            var ime = insets.getInsets(WindowInsets.Type.ime());
            insetL = bars.left; insetT = bars.top; insetR = bars.right; insetB = bars.bottom;
            v.setPadding(insetL, insetT, insetR, Math.max(insetB, ime.bottom));
            return insets;
        });
        setContentView(root);
        root.requestApplyInsets();
        loadApps();
        showHome(0);
    }

    @Override protected void onStart() {
        super.onStart();
        if (!listening) {
            launcherApps.registerCallback(appChanges);
            listening = true;
        }
    }

    @Override protected void onResume() {
        super.onResume();
        refresh();
        if (web != null && screen == Screen.AIRUNOTE) web.onResume();
    }

    @Override protected void onPause() {
        root.removeCallbacks(updateAirunoteBars);
        if (web != null) {
            rememberWorkspace(web.getUrl());
            web.onPause();
            CookieManager.getInstance().flush();
        }
        super.onPause();
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (root == null) return;
        if (hasFocus) updateBarIcons();
        refreshAirunoteBars();
    }

    @Override protected void onStop() {
        if (listening) {
            launcherApps.unregisterCallback(appChanges);
            listening = false;
        }
        super.onStop();
    }

    @Override protected void onDestroy() {
        root.removeCallbacks(updateAirunoteBars);
        if (web != null) {
            detach(web);
            web.destroy();
        }
        super.onDestroy();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        showHome(0);
    }

    @Override public void onBackPressed() {
        if (screen == Screen.AIRUNOTE && web != null && web.canGoBack()
                && webError.getVisibility() != View.VISIBLE) {
            var history = web.copyBackForwardList();
            var previous = history.getItemAtIndex(history.getCurrentIndex() - 1);
            if (previous == null || (workspaceUrl(web.getUrl()) != null && isLoginUrl(previous.getUrl()))) {
                showHome(0);
            } else {
                web.goBack();
            }
        } else if (screen != Screen.HOME || page != 0) {
            showHome(0);
        }
    }

    private void refresh() {
        loadApps();
        if (screen == Screen.HOME) showHome(page);
        if (screen == Screen.APPS && search != null) fillApps(search.getText().toString());
    }

    private void loadApps() {
        apps.clear();
        byPackage.clear();
        for (var app : launcherApps.getActivityList(null, Process.myUserHandle())) {
            String pkg = pkg(app);
            if (!pkg.equals(getPackageName())) apps.add(app);
        }
        var collator = Collator.getInstance();
        apps.sort((a, b) -> {
            int label = collator.compare(a.getLabel().toString(), b.getLabel().toString());
            return label != 0 ? label : a.getComponentName().compareTo(b.getComponentName());
        });
        for (var app : apps) byPackage.putIfAbsent(pkg(app), app);
    }

    private static String pkg(LauncherActivityInfo app) {
        return app.getComponentName().getPackageName();
    }

    private List<String> pins(int p) {
        String raw = prefs.getString(PIN_KEY + p, null);
        List<String> result = new ArrayList<>();
        if (raw == null) {
            if (p == 0) result.addAll(DEFAULT_PINS);
            return result;
        }
        try {
            JSONArray data = new JSONArray(raw);
            for (int i = 0; i < Math.min(data.length(), MAX_PINS); i++) result.add(data.getString(i));
        } catch (JSONException ignored) {
            // Preferences written by this app; a damaged value can be replaced by pinning again.
        }
        return result;
    }

    private void savePins(int p, List<String> pins) {
        prefs.edit().putString(PIN_KEY + p, new JSONArray(pins).toString()).apply();
    }

    private void stage(Screen next, boolean wallpaper) {
        if (search != null && next != Screen.APPS) {
            ((InputMethodManager) getSystemService(INPUT_METHOD_SERVICE))
                    .hideSoftInputFromWindow(search.getWindowToken(), 0);
            search = null;
        }
        if (web != null && next != Screen.AIRUNOTE) {
            rememberWorkspace(web.getUrl());
            web.onPause();
            detach(web);
        }
        screen = next;
        root.removeAllViews();
        root.setBackgroundColor(wallpaper ? Color.TRANSPARENT : bg);
        updateBarIcons();
        refreshAirunoteBars();
    }

    private void updateBarIcons() {
        WindowInsetsController bars = root.getWindowInsetsController();
        if (bars == null) return;
        int systemBars = WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars();
        if (screen == Screen.AIRUNOTE && prefs.getBoolean(HIDE_BARS_KEY, false)) {
            bars.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            bars.hide(systemBars);
        } else {
            bars.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_DEFAULT);
            bars.show(systemBars);
        }
        updateBarIconColors(bars);
    }

    private void updateBarIconColors(WindowInsetsController bars) {
        int status = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS;
        int nav = WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
        int appearance = 0;
        if (screen != Screen.HOME) {
            boolean webColors = screen == Screen.AIRUNOTE && !webFailed;
            if (Color.luminance(webColors ? airunoteTop : bg) > 0.18f) appearance |= status;
            if (Color.luminance(webColors ? airunoteBottom : bg) > 0.18f) appearance |= nav;
        }
        bars.setSystemBarsAppearance(appearance, status | nav);
    }

    private void refreshAirunoteBars() {
        root.removeCallbacks(updateAirunoteBars);
        if (screen == Screen.AIRUNOTE && hasWindowFocus()) root.post(updateAirunoteBars);
    }

    private static int parseWebColor(String css, int fallback) {
        if (!css.startsWith("rgb(") || !css.endsWith(")")) return fallback;
        String[] channels = css.substring(4, css.length() - 1).split(",");
        if (channels.length != 3) return fallback;
        try {
            return Color.rgb(
                    Integer.parseInt(channels[0].trim()),
                    Integer.parseInt(channels[1].trim()),
                    Integer.parseInt(channels[2].trim()));
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private void showHome(int nextPage) {
        stage(Screen.HOME, true);
        page = nextPage;
        FrameLayout surface = new FrameLayout(this);
        root.addView(surface, match());
        surface.setOnLongClickListener(v -> { homeMenu(); return true; });
        surface.setOnClickListener(v -> { });

        LinearLayout row = horizontal();
        FrameLayout.LayoutParams atTop = new FrameLayout.LayoutParams(-1, -2, Gravity.TOP);
        atTop.setMargins(dp(14), dp(33), dp(14), 0);
        surface.addView(row, atTop);
        List<String> pinned = pins(page);
        for (int i = 0; i < MAX_PINS; i++) {
            var app = i < pinned.size() ? byPackage.get(pinned.get(i)) : null;
            if (app != null) {
                View tile = tile(app, true);
                row.addView(tile, new LinearLayout.LayoutParams(0, dp(104), 1));
            } else {
                row.addView(new View(this), new LinearLayout.LayoutParams(0, dp(104), 1));
            }
        }

        LinearLayout dots = horizontal();
        dots.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams bottom = new FrameLayout.LayoutParams(dp(88), dp(44),
                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        bottom.bottomMargin = dp(108);
        surface.addView(dots, bottom);
        for (int i = 0; i < 2; i++) {
            final int destination = i;
            FrameLayout hit = new FrameLayout(this);
            hit.setContentDescription("Home page " + (i + 1));
            hit.setOnClickListener(v -> showHome(destination));
            hit.setSelected(page == i);
            View dot = new View(this);
            dot.setBackground(round(page == i ? Color.WHITE : 0x66ffffff, 5));
            hit.addView(dot, new FrameLayout.LayoutParams(dp(6), dp(6), Gravity.CENTER));
            dots.addView(hit, new LinearLayout.LayoutParams(0, -1, 1));
        }
    }

    @Override public boolean dispatchTouchEvent(MotionEvent e) {
        if (screen == Screen.AIRUNOTE) return super.dispatchTouchEvent(e);
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downX = e.getX(); downY = e.getY(); moved = false;
                break;
            case MotionEvent.ACTION_MOVE:
                if (Math.abs(e.getX() - downX) > ViewConfiguration.get(this).getScaledTouchSlop()
                        || Math.abs(e.getY() - downY) > ViewConfiguration.get(this).getScaledTouchSlop()) {
                    moved = true;
                }
                break;
            case MotionEvent.ACTION_UP:
                float dx = e.getX() - downX, dy = e.getY() - downY;
                boolean across = Math.abs(dx) > dp(54) && Math.abs(dx) > Math.abs(dy) * 1.4;
                boolean up = dy < -dp(54) && -dy > Math.abs(dx) * 1.4;
                if (screen == Screen.HOME && moved && (across || up)) {
                    MotionEvent cancel = MotionEvent.obtain(e);
                    cancel.setAction(MotionEvent.ACTION_CANCEL);
                    super.dispatchTouchEvent(cancel);
                    cancel.recycle();
                    if (up) showApps();
                    else if (dx > 0 && page == 0) openLeft();
                    else showHome(dx > 0 ? 0 : 1);
                    return true;
                }
                break;
            default:
                break;
        }
        return super.dispatchTouchEvent(e);
    }

    private void openLeft() {
        String target = prefs.getString(LEFT_KEY, "");
        if (NO_LEFT.equals(target)) return;
        if (target.isEmpty()) {
            showAirunote();
        } else {
            LauncherActivityInfo app = byPackage.get(target);
            if (app == null) {
                Toast.makeText(this, "Left page app is no longer available", Toast.LENGTH_SHORT).show();
                homeMenu();
            } else {
                launch(app);
            }
        }
    }

    private void showApps() {
        stage(Screen.APPS, false);
        LinearLayout body = vertical();
        body.setFocusableInTouchMode(true);
        root.addView(body, match());
        body.addView(header("All apps", this::showFirstPage));
        search = new EditText(this);
        search.setTextSize(16);
        search.setSingleLine();
        search.setPadding(dp(16), 0, dp(16), 0);
        search.setTextColor(fg);
        search.setHintTextColor(muted);
        search.setHint("Search apps");
        search.setBackground(round(panel, 16));
        LinearLayout.LayoutParams input = new LinearLayout.LayoutParams(-1, dp(52));
        input.setMargins(dp(18), dp(4), dp(18), dp(10));
        body.addView(search, input);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        body.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        appRows = vertical();
        appRows.setPadding(dp(10), dp(4), dp(10), dp(12));
        scroll.addView(appRows);
        body.requestFocus();
        search.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int c, int f) { }
            @Override public void onTextChanged(CharSequence s, int a, int b, int c) {
                fillApps(s.toString());
                scroll.scrollTo(0, 0);
            }
            @Override public void afterTextChanged(Editable e) { }
        });
        fillApps("");
    }

    private void fillApps(String query) {
        appRows.removeAllViews();
        String needle = query.trim().toLowerCase(Locale.ROOT);
        int columns = Math.max(3, Math.min(7, getResources().getConfiguration().screenWidthDp / 95));
        int index = 0;
        LinearLayout row = null;
        for (var app : apps) {
            if (!app.getLabel().toString().toLowerCase(Locale.ROOT).contains(needle)) continue;
            if (index % columns == 0) {
                row = horizontal();
                appRows.addView(row, new LinearLayout.LayoutParams(-1, -2));
            }
            row.addView(tile(app, false), new LinearLayout.LayoutParams(0, dp(90), 1));
            index++;
        }
        if (index == 0) {
            TextView empty = label("No matching apps", 16, muted);
            empty.setGravity(Gravity.CENTER);
            appRows.addView(empty, new LinearLayout.LayoutParams(-1, dp(120)));
        } else {
            for (int i = index % columns; i != 0 && i < columns; i++) {
                row.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1));
            }
        }
    }

    private View tile(LauncherActivityInfo app, boolean home) {
        LinearLayout tile = vertical();
        tile.setGravity(Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        tile.setPadding(dp(3), dp(7), dp(3), 0);
        tile.setContentDescription(app.getLabel());
        tile.setFocusable(true);
        ImageView icon = new ImageView(this);
        icon.setImageDrawable(app.getIcon(0));
        int size = dp(home ? 65 : 48);
        tile.addView(icon, new LinearLayout.LayoutParams(size, size));
        TextView name = label(app.getLabel(), home ? 11 : 12, home ? Color.WHITE : fg);
        name.setSingleLine(true);
        name.setEllipsize(TextUtils.TruncateAt.END);
        name.setGravity(Gravity.CENTER);
        if (home) {
            name.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
            name.setShadowLayer(dp(2), 0, dp(1), 0xd5000000);
        }
        LinearLayout.LayoutParams below = new LinearLayout.LayoutParams(-1, -2);
        below.topMargin = dp(4);
        tile.addView(name, below);
        tile.setOnClickListener(v -> launch(app));
        tile.setOnLongClickListener(v -> { appMenu(app, home); return true; });
        return tile;
    }

    private void launch(LauncherActivityInfo app) {
        try {
            launcherApps.startMainActivity(app.getComponentName(), app.getUser(), null, null);
        } catch (SecurityException | android.content.ActivityNotFoundException e) {
            Toast.makeText(this, "This app could not be opened", Toast.LENGTH_SHORT).show();
        }
    }

    private void appMenu(LauncherActivityInfo app, boolean home) {
        String pkg = pkg(app);
        int current = page;
        String[] options = home ? new String[]{"Remove from Home", "App info"}
                : new String[]{"Pin to Home page 1", "Pin to Home page 2", "App info"};
        new AlertDialog.Builder(this).setTitle(app.getLabel()).setItems(options, (dialog, choice) -> {
            if (choice == options.length - 1) {
                startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.fromParts("package", pkg, null)));
            } else if (home) {
                var list = pins(current);
                list.remove(pkg);
                savePins(current, list);
                showHome(current);
            } else {
                var list = pins(choice);
                if (list.contains(pkg)) return;
                list.removeIf(p -> !byPackage.containsKey(p));
                if (list.size() >= MAX_PINS) {
                    Toast.makeText(this, "This page is full. Remove an icon first.", Toast.LENGTH_SHORT).show();
                    return;
                }
                list.add(pkg);
                savePins(choice, list);
                Toast.makeText(this, "Pinned to Home page " + (choice + 1), Toast.LENGTH_SHORT).show();
            }
        }).show();
    }

    private void homeMenu() {
        new AlertDialog.Builder(this).setTitle("Home settings")
                .setItems(new String[]{"Open Airunote", "Left page", "Default Home app", "All apps",
                                "Airunote system bars"},
                        (dialog, i) -> {
                            if (i == 0) showAirunote();
                            else if (i == 1) leftMenu();
                            else if (i == 2) chooseHome();
                            else if (i == 3) showApps();
                            else chooseAirunoteBars();
                        }).show();
    }

    private void chooseAirunoteBars() {
        new AlertDialog.Builder(this).setTitle("Airunote system bars")
                .setSingleChoiceItems(new String[]{"Match Airunote", "Hide in Airunote"},
                        prefs.getBoolean(HIDE_BARS_KEY, false) ? 1 : 0, (dialog, choice) -> {
                            prefs.edit().putBoolean(HIDE_BARS_KEY, choice == 1).apply();
                            dialog.dismiss();
                        })
                .setNegativeButton("Cancel", null).show();
    }

    private void leftMenu() {
        String target = prefs.getString(LEFT_KEY, "");
        String app = byPackage.containsKey(target) ? byPackage.get(target).getLabel().toString() : "";
        String[] choices = {"Airunote", app.isEmpty() ? "Choose an app…" : "App: " + app, "Off"};
        int selected = target.isEmpty() ? 0 : NO_LEFT.equals(target) ? 2 : 1;
        new AlertDialog.Builder(this).setTitle("Left page")
                .setSingleChoiceItems(choices, selected, (dialog, i) -> {
                    dialog.dismiss();
                    if (i == 1) pickLeftApp();
                    else prefs.edit().putString(LEFT_KEY, i == 2 ? NO_LEFT : "").apply();
                }).setNegativeButton("Cancel", null).show();
    }

    private void pickLeftApp() {
        var choices = new ArrayList<>(byPackage.values());
        var collator = Collator.getInstance();
        choices.sort((a, b) -> collator.compare(a.getLabel().toString(), b.getLabel().toString()));
        String[] labels = new String[choices.size()];
        for (int i = 0; i < choices.size(); i++) labels[i] = choices.get(i).getLabel().toString();
        new AlertDialog.Builder(this).setTitle("Open from the left page")
                .setItems(labels, (d, i) -> prefs.edit().putString(LEFT_KEY, pkg(choices.get(i))).apply())
                .setNegativeButton("Cancel", null).show();
    }

    private void chooseHome() {
        RoleManager role = getSystemService(RoleManager.class);
        if (role.isRoleAvailable(RoleManager.ROLE_HOME) && !role.isRoleHeld(RoleManager.ROLE_HOME)) {
            startActivityForResult(role.createRequestRoleIntent(RoleManager.ROLE_HOME), SET_HOME);
        } else {
            startActivity(new Intent(Settings.ACTION_HOME_SETTINGS));
        }
    }

    private void showFirstPage() { showHome(0); }

    private void showAirunote() {
        stage(Screen.AIRUNOTE, false);
        webHost = new FrameLayout(this);
        root.addView(webHost, match());
        webError = vertical();
        webError.setGravity(Gravity.CENTER);
        webError.setPadding(dp(24), dp(24), dp(24), dp(24));
        webError.setBackgroundColor(bg);
        TextView offline = label("Airunote couldn’t load", 21, fg);
        offline.setGravity(Gravity.CENTER);
        webError.addView(offline);
        TextView help = label("Check your connection and try again.", 15, muted);
        help.setGravity(Gravity.CENTER);
        help.setPadding(0, dp(10), 0, dp(12));
        webError.addView(help);
        webError.addView(action("Try again", () -> web.reload()));
        webError.setVisibility(View.GONE);
        if (web == null) createWeb();
        detach(web);
        webHost.addView(web, match());
        webHost.addView(webError, match());
        webError.setVisibility(webFailed ? View.VISIBLE : View.GONE);
        web.onResume();
        if (web.getUrl() == null) {
            String workspace = workspaceUrl(prefs.getString(WORKSPACE_KEY, null));
            web.loadUrl(workspace != null ? workspace : AIRUNOTE);
        }
        refreshAirunoteBars();
    }

    private boolean webFailed;

    private void createWeb() {
        web = new WebView(this);
        web.setBackgroundColor(bg);
        var settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (inAirunote(uri)) return false;
                if (request.hasGesture() && ("https".equalsIgnoreCase(uri.getScheme())
                        || "mailto".equalsIgnoreCase(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (android.content.ActivityNotFoundException ignored) { }
                }
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                setWebFailed(false);
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) {
                rememberWorkspace(url);
                refreshAirunoteBars();
            }
            @Override public void onPageCommitVisible(WebView view, String url) {
                refreshAirunoteBars();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError error) {
                if (req.isForMainFrame()) setWebFailed(true);
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest req,
                                                       android.webkit.WebResourceResponse error) {
                if (req.isForMainFrame() && error.getStatusCode() >= 500) setWebFailed(true);
            }
        });
    }

    private void rememberWorkspace(String url) {
        String workspace = workspaceUrl(url);
        String previous = prefs.getString(WORKSPACE_KEY, null);
        if (workspace != null && !workspace.equals(previous)) {
            prefs.edit().putString(WORKSPACE_KEY, workspace).apply();
        } else if (previous != null && isLoginUrl(url)) {
            prefs.edit().remove(WORKSPACE_KEY).apply();
        }
    }

    private static boolean isLoginUrl(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        return inAirunote(uri) && "/login".equals(uri.getPath());
    }

    private static String workspaceUrl(String url) {
        if (url == null) return null;
        Uri uri = Uri.parse(url);
        if (!inAirunote(uri)) return null;
        List<String> path = uri.getPathSegments();
        if (path.size() < 3 || !"orgs".equals(path.get(0)) || !"airunote".equals(path.get(2))) {
            return null;
        }
        String org = path.get(1);
        if (!org.matches("[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")) return null;
        return uri.buildUpon().encodedPath("/orgs/" + org + "/airunote")
                .clearQuery().fragment(null).build().toString();
    }

    private void setWebFailed(boolean failed) {
        webFailed = failed;
        if (webError != null) webError.setVisibility(failed ? View.VISIBLE : View.GONE);
        root.invalidate();
        updateBarIcons();
    }

    private static boolean inAirunote(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme()) && uri.getUserInfo() == null
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && ("www.airunote.com".equalsIgnoreCase(uri.getHost())
                    || "airunote.com".equalsIgnoreCase(uri.getHost()));
    }

    private LinearLayout header(String title, Runnable back) {
        LinearLayout header = horizontal();
        header.setPadding(dp(8), 0, dp(12), 0);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setMinimumHeight(dp(56));
        TextView backButton = action("‹  Home", back);
        backButton.setContentDescription("Back to Home");
        header.addView(backButton);
        TextView text = label(title, 19, fg);
        text.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        text.setGravity(Gravity.CENTER);
        header.addView(text, new LinearLayout.LayoutParams(0, -1, 1));
        header.addView(new View(this), new LinearLayout.LayoutParams(dp(52), 1));
        return header;
    }

    private TextView action(String title, Runnable click) {
        TextView v = label(title, 15, accent);
        v.setPadding(dp(9), 0, dp(9), 0);
        v.setMinHeight(dp(48));
        v.setGravity(Gravity.CENTER);
        v.setFocusable(true);
        v.setOnClickListener(x -> click.run());
        return v;
    }

    private TextView label(CharSequence value, int sp, int color) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(sp);
        text.setTextColor(color);
        return text;
    }

    private static void detach(View v) {
        if (v.getParent() instanceof android.view.ViewGroup) {
            ((android.view.ViewGroup) v.getParent()).removeView(v);
        }
    }

    private LinearLayout horizontal() { return new LinearLayout(this); }
    private LinearLayout vertical() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }

    private GradientDrawable round(int color, int radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radius));
        return d;
    }

    private static FrameLayout.LayoutParams match() {
        return new FrameLayout.LayoutParams(-1, -1);
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
