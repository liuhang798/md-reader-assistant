//go:build darwin

package main

/*
#cgo CFLAGS: -x objective-c -fblocks
#cgo LDFLAGS: -framework Cocoa

#import <Cocoa/Cocoa.h>
#import <dispatch/dispatch.h>
#import <objc/runtime.h>

typedef BOOL (*MDAWindowShouldCloseIMP)(id, SEL, NSWindow *);

static MDAWindowShouldCloseIMP mdaOriginalWindowShouldClose = NULL;
static BOOL mdaFullscreenClosePending = NO;
static char mdaTrafficLightObserversKey;

static void mdaCenterTrafficLights(NSWindow *window) {
    if (window == nil || window.contentView == nil) {
        return;
    }

    const CGFloat titlebarHeight = 42.0;
    NSRect contentInWindow = [window.contentView convertRect:window.contentView.bounds toView:nil];
    CGFloat targetCenterY = NSMaxY(contentInWindow) - titlebarHeight / 2.0;
    const NSWindowButton buttonTypes[] = {
        NSWindowCloseButton,
        NSWindowMiniaturizeButton,
        NSWindowZoomButton,
    };
    for (NSUInteger index = 0; index < sizeof(buttonTypes) / sizeof(buttonTypes[0]); index++) {
        NSButton *button = [window standardWindowButton:buttonTypes[index]];
        NSView *container = button.superview;
        if (button == nil || container == nil) {
            continue;
        }
        NSRect buttonInWindow = [container convertRect:button.frame toView:nil];
        NSPoint targetInContainer = [container convertPoint:NSMakePoint(NSMidX(buttonInWindow), targetCenterY) fromView:nil];
        NSRect frame = button.frame;
        frame.origin.y = targetInContainer.y - NSHeight(frame) / 2.0;
        button.frame = frame;
    }
}

static void mdaScheduleTrafficLightCentering(NSWindow *window) {
    dispatch_async(dispatch_get_main_queue(), ^{
        mdaCenterTrafficLights(window);
    });
}

static void mdaInstallTrafficLightCentering(NSWindow *window) {
    mdaCenterTrafficLights(window);
    if (objc_getAssociatedObject(window, &mdaTrafficLightObserversKey) != nil) {
        return;
    }

    NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
    NSMutableArray *tokens = [NSMutableArray arrayWithCapacity:4];
    NSArray<NSNotificationName> *names = @[
        NSWindowDidResizeNotification,
        NSWindowDidBecomeKeyNotification,
        NSWindowDidEnterFullScreenNotification,
        NSWindowDidExitFullScreenNotification,
    ];
    for (NSNotificationName name in names) {
        id token = [center addObserverForName:name object:window queue:NSOperationQueue.mainQueue usingBlock:^(__unused NSNotification *notification) {
            mdaScheduleTrafficLightCentering(window);
        }];
        [tokens addObject:token];
    }
    objc_setAssociatedObject(window, &mdaTrafficLightObserversKey, tokens, OBJC_ASSOCIATION_RETAIN_NONATOMIC);

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 100 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
        mdaCenterTrafficLights(window);
    });
}

static BOOL mdaWindowIsFullscreen(NSWindow *window) {
    return (window.styleMask & NSWindowStyleMaskFullScreen) == NSWindowStyleMaskFullScreen;
}

static void mdaHideAfterFullscreenExit(NSWindow *window, NSInteger attemptsRemaining) {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 50 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
        if (!mdaWindowIsFullscreen(window) || attemptsRemaining <= 0) {
            [NSApp hide:nil];
            mdaFullscreenClosePending = NO;
            return;
        }
        mdaHideAfterFullscreenExit(window, attemptsRemaining - 1);
    });
}

static BOOL mdaWindowShouldClose(id delegate, SEL selector, NSWindow *window) {
    if (mdaWindowIsFullscreen(window)) {
        if (!mdaFullscreenClosePending) {
            mdaFullscreenClosePending = YES;
            [window toggleFullScreen:nil];
            mdaHideAfterFullscreenExit(window, 40);
        }
        return NO;
    }
    return mdaOriginalWindowShouldClose(delegate, selector, window);
}

static void mdaInstallWindowAdjustments(NSInteger attemptsRemaining) {
    NSWindow *window = NSApp.mainWindow ?: NSApp.keyWindow;
    if (window == nil) {
        if (attemptsRemaining > 0) {
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 50 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
                mdaInstallWindowAdjustments(attemptsRemaining - 1);
            });
        }
        return;
    }

    mdaInstallTrafficLightCentering(window);
    id delegate = window.delegate;
    if (delegate == nil) {
        return;
    }

    Class delegateClass = object_getClass(delegate);
    SEL selector = @selector(windowShouldClose:);
    Method method = class_getInstanceMethod(delegateClass, selector);
    if (method == NULL || method_getImplementation(method) == (IMP)mdaWindowShouldClose) {
        return;
    }

    mdaOriginalWindowShouldClose = (MDAWindowShouldCloseIMP)method_getImplementation(method);
    method_setImplementation(method, (IMP)mdaWindowShouldClose);
}

static void mdaInstallFullscreenCloseWorkaround(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        mdaInstallWindowAdjustments(20);
    });
}

static void mdaPerformClose(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSWindow *window = NSApp.mainWindow ?: NSApp.keyWindow;
        if (window != nil) {
            [window performClose:nil];
        }
    });
}
*/
import "C"

func installMacFullscreenCloseWorkaround() {
	C.mdaInstallFullscreenCloseWorkaround()
}

func closeMacWindow() {
	C.mdaPerformClose()
}
