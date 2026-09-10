#!/usr/bin/env swift
// A fail-closed macOS capture hook. It launches the release Gallery, locates
// that process's real on-screen window, and asks macOS to capture that window.
// Geometry comes only from pixels in that PNG; no Gallery layout values are
// read or reconstructed by this harness.

import AppKit
import CoreGraphics
import Darwin
import Foundation
import ImageIO
import Vision
import ApplicationServices

private struct Viewport: Decodable {
    let width: Int
    let height: Int
}

private struct Scene: Decodable {
    let id: String
    let component_id: String
    let suite: String
    let theme: String?
    let viewport: Viewport?
    let assertions: [String]?
}

private struct Rect: Encodable {
    let x: Int
    let y: Int
    let width: Int
    let height: Int
}

private struct WindowObservation {
    let id: CGWindowID
    let bounds: CGRect
    let title: String?
    let layer: Int
    let alpha: Double
    let isOnscreen: Bool?
    let sharingState: Int?
}

private struct CaptureCoordinateBridge {
    let windowBoundsPoints: CGRect
    let targetPhysicalPixels: CGPoint
    let displayID: CGDirectDisplayID
    let backingScaleFactor: CGFloat
    let pngWindowScaleX: CGFloat
    let pngWindowScaleY: CGFloat
    let finalCGEventPoint: CGPoint
    let overlappingDisplayIDs: [CGDirectDisplayID]

    private struct DisplayIntersection {
        let id: CGDirectDisplayID
        let bounds: CGRect
        let backingScale: CGFloat
        let area: CGFloat
    }

    private static func displayIntersections(for bounds: CGRect) -> [DisplayIntersection] {
        var displayCount: UInt32 = 0
        var displayIDs = [CGDirectDisplayID](repeating: 0, count: 16)
        guard CGGetActiveDisplayList(UInt32(displayIDs.count), &displayIDs, &displayCount) == .success else {
            return []
        }
        return displayIDs.prefix(Int(displayCount)).compactMap { displayID in
            let displayBounds = CGDisplayBounds(displayID)
            let intersection = bounds.intersection(displayBounds)
            guard !intersection.isNull, intersection.width > 0, intersection.height > 0,
                  let screen = NSScreen.screens.first(where: {
                      ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == displayID
                  })
            else {
                return nil
            }
            return DisplayIntersection(
                id: displayID,
                bounds: displayBounds,
                backingScale: screen.backingScaleFactor,
                area: intersection.width * intersection.height
            )
        }
    }

    static func resolve(window: WindowObservation, image: PixelImage, plan: [String: Any]) throws -> CaptureCoordinateBridge {
        let intersections = displayIntersections(for: window.bounds)
        guard let selected = intersections.max(by: { $0.area < $1.area }) else {
            throw CaptureError.captureFailed("coordinate bridge found no display intersection for the captured window")
        }
        let substantialIntersections = intersections.filter { $0.area >= 1.0 }
        guard substantialIntersections.count == 1 else {
            let ids = substantialIntersections.map { String($0.id) }.joined(separator: ",")
            throw CaptureError.captureFailed("coordinate bridge refuses a window spanning displays (display_ids=\(ids))")
        }
        guard selected.id == CGMainDisplayID() else {
            throw CaptureError.captureFailed("coordinate bridge refuses a non-main display (display_id=\(selected.id), main=\(CGMainDisplayID()))")
        }

        let scaleX = CGFloat(image.width) / window.bounds.width
        let scaleY = CGFloat(image.height) / window.bounds.height
        let scaleTolerance: CGFloat = 0.02
        guard scaleX > 0, scaleY > 0,
              abs(scaleX - scaleY) <= scaleTolerance,
              abs(scaleX - selected.backingScale) <= scaleTolerance,
              abs(scaleY - selected.backingScale) <= scaleTolerance
        else {
            throw CaptureError.captureFailed(
                "coordinate bridge scale mismatch (png/window sx=\(scaleX), sy=\(scaleY), backing=\(selected.backingScale))"
            )
        }

        let physicalPoint: CGPoint
        if let point = plan["capture_point_physical_pixels"] as? [String: Double],
           let x = point["x"], let y = point["y"] {
            physicalPoint = CGPoint(x: CGFloat(x), y: CGFloat(y))
        } else {
            let relative = plan["relative_point"] as? [String: Double] ?? ["x": 0.16, "y": 0.5]
            physicalPoint = CGPoint(
                x: CGFloat(relative["x"] ?? 0.16) * CGFloat(image.width),
                y: CGFloat(relative["y"] ?? 0.5) * CGFloat(image.height)
            )
        }
        guard physicalPoint.x >= 0, physicalPoint.y >= 0,
              physicalPoint.x <= CGFloat(image.width), physicalPoint.y <= CGFloat(image.height)
        else {
            throw CaptureError.captureFailed(
                "coordinate bridge target physical pixel lies outside the captured PNG (x=\(physicalPoint.x), y=\(physicalPoint.y), size=\(image.width)x\(image.height))"
            )
        }
        let finalPoint = CGPoint(
            x: window.bounds.minX + physicalPoint.x / scaleX,
            y: window.bounds.minY + physicalPoint.y / scaleY
        )
        guard selected.bounds.insetBy(dx: -0.5, dy: -0.5).contains(finalPoint) else {
            throw CaptureError.captureFailed("coordinate bridge mapped the target outside the selected display")
        }
        return CaptureCoordinateBridge(
            windowBoundsPoints: window.bounds,
            targetPhysicalPixels: physicalPoint,
            displayID: selected.id,
            backingScaleFactor: selected.backingScale,
            pngWindowScaleX: scaleX,
            pngWindowScaleY: scaleY,
            finalCGEventPoint: finalPoint,
            overlappingDisplayIDs: substantialIntersections.map(\.id)
        )
    }

    func record() -> [String: Any] {
        [
            "window_bounds_points": [
                "x": windowBoundsPoints.origin.x,
                "y": windowBoundsPoints.origin.y,
                "width": windowBoundsPoints.width,
                "height": windowBoundsPoints.height,
            ],
            "target_physical_pixels": [
                "x": targetPhysicalPixels.x,
                "y": targetPhysicalPixels.y,
            ],
            "display_id": Int(displayID),
            "backing_scale_factor": backingScaleFactor,
            "png_window_scale": ["sx": pngWindowScaleX, "sy": pngWindowScaleY],
            "final_cg_event_point": ["x": finalCGEventPoint.x, "y": finalCGEventPoint.y],
            "overlapping_display_ids": overlappingDisplayIDs.map { Int($0) },
            "coordinate_space": "Quartz global points for CGEvent",
        ]
    }
}

private struct PixelImage {
    let width: Int
    let height: Int
    let rgba: [UInt8]
}

private struct PixelDelta {
    let dimensionsMatch: Bool
    let changedPixelCount: Int
    let significantPixelCount: Int
    let maximumChannelDelta: Int
    let boundingRect: Rect?
}

private struct Color: Hashable {
    let red: UInt8
    let green: UInt8
    let blue: UInt8
    let alpha: UInt8
}

private struct SurfaceObservation {
    let rect: Rect
    let color: Color
    let pixelCount: Int
}

private struct RenderedCapture {
    let window: WindowObservation
    let pixels: PixelImage
    let histogram: [Color: Int]
    let dominantPixelCount: Int
    let surfaces: [SurfaceObservation]
}

private struct ModalProbeResult {
    let steps: [[String: Any]]
    let hashes: [String: String]
    let observed: Bool
    let coordinateBridge: [String: Any]
    let transition: [String: Any]
    let foregroundPID: pid_t
}

private struct PlatformInputReadiness {
    let foregroundPID: pid_t
    let windowID: CGWindowID
    let activationAttempt: Int
    let pollCount: Int
    let stablePolls: Int

    func record() -> [String: Any] {
        [
            "foreground_pid": Int(foregroundPID),
            "window_id": Int(windowID),
            "activation_attempt": activationAttempt,
            "poll_count": pollCount,
            "stable_polls": stablePolls,
            "status": "ready_for_platform_input",
        ]
    }
}

private final class ProcessOutputDrain {
    private let lock = NSLock()
    private var stdoutData = Data()
    private var stderrData = Data()

    let stdout = Pipe()
    let stderr = Pipe()

    init() {
        stdout.fileHandleForReading.readabilityHandler = { [weak self] handle in
            self?.append(handle.availableData, to: true)
        }
        stderr.fileHandleForReading.readabilityHandler = { [weak self] handle in
            self?.append(handle.availableData, to: false)
        }
    }

    private func append(_ data: Data, to stdout: Bool) {
        guard !data.isEmpty else { return }
        lock.lock()
        defer { lock.unlock() }
        if stdout {
            stdoutData.append(data.suffix(32_768))
        } else {
            stderrData.append(data.suffix(32_768))
        }
    }

    func text() -> (stdout: String, stderr: String) {
        lock.lock()
        defer { lock.unlock() }
        return (
            String(data: stdoutData, encoding: .utf8) ?? "",
            String(data: stderrData, encoding: .utf8) ?? ""
        )
    }

    func finish() -> (stdout: String, stderr: String) {
        stdout.fileHandleForReading.readabilityHandler = nil
        stderr.fileHandleForReading.readabilityHandler = nil
        append(stdout.fileHandleForReading.readDataToEndOfFile(), to: true)
        append(stderr.fileHandleForReading.readDataToEndOfFile(), to: false)
        return text()
    }

    func closeWriteEnds() {
        stdout.fileHandleForWriting.closeFile()
        stderr.fileHandleForWriting.closeFile()
    }
}

private final class GalleryProcess {
    let processIdentifier: pid_t
    let arguments: [String]
    let launchMode: String
    private let isChildProcess: Bool
    private var exitStatus: Int32?

    init(processIdentifier: pid_t, arguments: [String], launchMode: String, isChildProcess: Bool) {
        self.processIdentifier = processIdentifier
        self.arguments = arguments
        self.launchMode = launchMode
        self.isChildProcess = isChildProcess
    }

    private func reap(nonblocking: Bool) {
        guard isChildProcess, exitStatus == nil else { return }
        var status: Int32 = 0
        let result = waitpid(processIdentifier, &status, nonblocking ? WNOHANG : 0)
        if result == processIdentifier {
            exitStatus = status
        } else if result == -1 {
            exitStatus = -1
        }
    }

    var isRunning: Bool {
        if !isChildProcess {
            guard exitStatus == nil else { return false }
            if kill(processIdentifier, 0) == 0 || errno == EPERM {
                return true
            }
            exitStatus = -1
            return false
        }
        reap(nonblocking: true)
        return exitStatus == nil
    }

    var terminationStatus: Int32 {
        reap(nonblocking: true)
        return exitStatus ?? 0
    }

    func waitUntilExit() {
        if isChildProcess {
            reap(nonblocking: false)
        }
    }

    func requestTermination() {
        guard !isChildProcess else { return }
        _ = NSRunningApplication(processIdentifier: processIdentifier)?.terminate()
    }

    func forceTermination() {
        guard !isChildProcess else { return }
        _ = NSRunningApplication(processIdentifier: processIdentifier)?.forceTerminate()
    }
}

private enum CaptureError: LocalizedError {
    case usage(String)
    case invalidScene(String)
    case galleryMissing(String)
    case galleryExited(Int32)
    case windowUnavailable(pid: pid_t)
    case captureFailed(String)
    case imageInvalid(String)
    case geometryUnavailable

    var errorDescription: String? {
        switch self {
        case .usage(let message), .invalidScene(let message), .galleryMissing(let message),
             .captureFailed(let message), .imageInvalid(let message):
            return message
        case .galleryExited(let status):
            return "release Gallery exited before a window was captured (status \(status))"
        case .windowUnavailable(let pid):
            return "no stable on-screen macOS window was observed for Gallery pid \(pid)"
        case .geometryUnavailable:
            return "the captured PNG contains no independently observable internal surface"
        }
    }
}

private func usage() -> Never {
    fputs("usage: capture-macos.swift --gallery <absolute-release-gallery> [--gallery-app <absolute-release-app>] --scene <scene.json> --out-dir <absolute-dir>\n", stderr)
    exit(64)
}

private func commandOutput(_ executable: String, _ arguments: [String]) -> String? {
    let process = Process()
    let output = Pipe()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    process.standardOutput = output
    process.standardError = Pipe()
    do {
        try process.run()
        process.waitUntilExit()
    } catch {
        return nil
    }
    guard process.terminationStatus == 0 else { return nil }
    return String(data: output.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
        .trimmingCharacters(in: .whitespacesAndNewlines)
}

private func releaseRevision(_ gallery: URL) -> String {
    let digest = commandOutput("/usr/bin/shasum", ["-a", "256", gallery.path])?
        .split(separator: " ").first
        .map(String.init)
    return "gallery-release-sha256:\(digest ?? "unavailable")"
}

private func runTool(_ executable: String, _ arguments: [String]) throws {
    let process = Process()
    let stderr = Pipe()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    process.standardError = stderr
    try process.run()
    process.waitUntilExit()
    guard process.terminationStatus == 0 else {
        let message = String(data: stderr.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? "unknown process error"
        throw CaptureError.captureFailed("\(executable) failed: \(message.trimmingCharacters(in: .whitespacesAndNewlines))")
    }
}

private func fileSha256(_ url: URL) -> String {
    commandOutput("/usr/bin/shasum", ["-a", "256", url.path])?.split(separator: " ").first.map(String.init) ?? "unavailable"
}

private func captureWindow(_ window: WindowObservation, to url: URL) throws {
    try? FileManager.default.removeItem(at: url)
    try runTool("/usr/sbin/screencapture", ["-l\(window.id)", "-o", "-x", "-t", "png", url.path])
}

private func postKey(
    _ keyCode: CGKeyCode,
    flags: CGEventFlags = [],
    process: GalleryProcess,
    window: WindowObservation,
    stage: String
) throws -> PlatformInputReadiness {
    let source = CGEventSource(stateID: .hidSystemState)
    let down = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: true)
    let up = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: false)
    down?.flags = flags
    up?.flags = flags
    _ = try activateGalleryForPlatformInput(process, window: window, stage: "\(stage):key_down")
    down?.post(tap: .cghidEventTap)
    let readiness = try activateGalleryForPlatformInput(process, window: window, stage: "\(stage):key_up")
    up?.post(tap: .cghidEventTap)
    return readiness
}

private func postClick(
    at point: CGPoint,
    process: GalleryProcess,
    window: WindowObservation,
    stage: String
) throws -> PlatformInputReadiness {
    let source = CGEventSource(stateID: .hidSystemState)
    let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left)
    let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left)
    _ = try activateGalleryForPlatformInput(process, window: window, stage: "\(stage):mouse_down")
    down?.post(tap: .cghidEventTap)
    let readiness = try activateGalleryForPlatformInput(process, window: window, stage: "\(stage):mouse_up")
    up?.post(tap: .cghidEventTap)
    return readiness
}

private func activateGalleryForPlatformInput(
    _ process: GalleryProcess,
    window expectedWindow: WindowObservation,
    stage: String
) throws -> PlatformInputReadiness {
    let activationAttempts = 4
    let pollsPerAttempt = 12
    let requiredStablePolls = 3
    guard let application = NSRunningApplication(processIdentifier: process.processIdentifier) else {
        throw CaptureError.captureFailed("release Gallery pid \(process.processIdentifier) is not an NSRunningApplication for platform input")
    }

    var lastForegroundPID: pid_t?
    var lastWindowID: CGWindowID?
    var lastWindowOnscreen: Bool?
    var lastApplicationActive = false
    var lastWindowMatched = false
    var lastActivationAccepted = false
    var totalPolls = 0

    for attempt in 1...activationAttempts {
        guard process.isRunning else {
            throw CaptureError.galleryExited(process.terminationStatus)
        }
        application.unhide()
        lastActivationAccepted = application.activate()
        _ = application.activate(options: [.activateAllWindows])
        var stablePolls = 0

        for _ in 0..<pollsPerAttempt {
            guard process.isRunning else {
                throw CaptureError.galleryExited(process.terminationStatus)
            }
            totalPolls += 1
            let foregroundPID = NSWorkspace.shared.frontmostApplication?.processIdentifier
            let observedWindow = frontWindow(for: process.processIdentifier)
            let windowMatched = observedWindow.map { sameWindow($0, expectedWindow) } ?? false
            let windowOnscreen = observedWindow?.isOnscreen == true
            let applicationActive = application.isActive

            lastForegroundPID = foregroundPID
            lastWindowID = observedWindow?.id
            lastWindowOnscreen = observedWindow?.isOnscreen
            lastApplicationActive = applicationActive
            lastWindowMatched = windowMatched

            if applicationActive,
               foregroundPID == process.processIdentifier,
               windowMatched,
               windowOnscreen {
                stablePolls += 1
                if stablePolls >= requiredStablePolls {
                    return PlatformInputReadiness(
                        foregroundPID: process.processIdentifier,
                        windowID: expectedWindow.id,
                        activationAttempt: attempt,
                        pollCount: totalPolls,
                        stablePolls: stablePolls
                    )
                }
            } else {
                stablePolls = 0
            }
            Thread.sleep(forTimeInterval: 0.10)
        }
    }

    throw CaptureError.captureFailed(
        "release Gallery was not ready for platform input at stage=\(stage); expected_pid=\(process.processIdentifier), expected_window_id=\(expectedWindow.id), last_foreground_pid=\(lastForegroundPID.map(String.init) ?? "none"), last_window_id=\(lastWindowID.map(String.init) ?? "none"), last_window_onscreen=\(lastWindowOnscreen.map(String.init) ?? "none"), app_active=\(lastApplicationActive), activation_accepted=\(lastActivationAccepted), window_matched=\(lastWindowMatched), activation_attempts=\(activationAttempts), polls=\(totalPolls)"
    )
}

private func axAttribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else { return nil }
    return value
}

private func axBool(_ element: AXUIElement, _ name: String) -> Bool? {
    (axAttribute(element, name) as? NSNumber)?.boolValue
}

private func axValueDescription(_ element: AXUIElement) -> String {
    guard let value = axAttribute(element, kAXValueAttribute) else { return "" }
    if let string = value as? String { return string }
    if let number = value as? NSNumber { return number.stringValue }
    return ""
}

private func axGeometry(_ element: AXUIElement, _ name: String) -> [String: Double]? {
    guard let value = axAttribute(element, name), CFGetTypeID(value) == AXValueGetTypeID() else { return nil }
    let axValue = unsafeBitCast(value, to: AXValue.self)
    switch AXValueGetType(axValue) {
    case .cgPoint:
        var point = CGPoint.zero
        guard AXValueGetValue(axValue, .cgPoint, &point) else { return nil }
        return ["x": point.x, "y": point.y]
    case .cgSize:
        var size = CGSize.zero
        guard AXValueGetValue(axValue, .cgSize, &size) else { return nil }
        return ["width": size.width, "height": size.height]
    default:
        return nil
    }
}

private func axNode(_ element: AXUIElement, path: String, depth: Int, count: inout Int, limit: Int) -> [String: Any] {
    guard count < limit else { return ["id": path, "role": "truncated", "children": []] }
    count += 1
    let role = (axAttribute(element, kAXRoleAttribute) as? String) ?? "unknown"
    let title = (axAttribute(element, kAXTitleAttribute) as? String) ?? ""
    let focused = axBool(element, kAXFocusedAttribute) ?? false
    let visible = !(axBool(element, kAXHiddenAttribute) ?? false)
    var node: [String: Any] = [
        "id": path,
        "role": role,
        "title": title,
        "value": axValueDescription(element),
        "visible": visible,
        "landmark": role == "AXWindow" ? "window" : NSNull(),
        "focused": focused,
        "enabled": axBool(element, kAXEnabledAttribute) ?? false,
        "selected": axBool(element, kAXSelectedAttribute) ?? false,
        "expanded": axBool(element, kAXExpandedAttribute) ?? false,
        "geometry": [String: Any](),
        "children": [],
    ]
    var geometry: [String: Any] = [:]
    if let position = axGeometry(element, kAXPositionAttribute) { geometry["position"] = position }
    if let size = axGeometry(element, kAXSizeAttribute) { geometry["size"] = size }
    node["geometry"] = geometry
    guard depth < 8, let children = axAttribute(element, kAXChildrenAttribute) as? [AXUIElement] else { return node }
    var childNodes: [[String: Any]] = []
    for (index, child) in children.prefix(64).enumerated() {
        childNodes.append(axNode(child, path: "\(path).\(index)", depth: depth + 1, count: &count, limit: limit))
    }
    node["children"] = childNodes
    return node
}

private func axSnapshot(for pid: pid_t) -> [String: Any] {
    guard AXIsProcessTrusted() else {
        return ["status": "blocked", "trusted": false, "nodes": [], "focused_ax_id": NSNull(), "internal_controls": [], "internal_control_count": 0, "window_count": 0]
    }
    let application = AXUIElementCreateApplication(pid)
    var count = 0
    let root = axNode(application, path: "application", depth: 0, count: &count, limit: 256)
    let role = root["role"] as? String ?? "unknown"
    let windows = (axAttribute(application, kAXWindowsAttribute) as? [AXUIElement])?.count ?? 0
    let focused = axAttribute(application, kAXFocusedUIElementAttribute) != nil
    let controls = countInternalAXControls(root, windowDepth: 0)
    let focusedID: Any = focusedAXID(root).map { $0 as Any } ?? NSNull()
    return [
        "status": controls > 0 && focused ? "observed" : "blocked",
        "trusted": true,
        "nodes": [root],
        "focused_ax_id": focusedID,
        "window_count": windows,
        "root_role": role,
        "focused_element_present": focused,
        "internal_control_count": controls,
        "internal_controls": collectInternalAXControls(root, windowDepth: 0),
        "limits": ["max_depth": 8, "max_nodes": 256, "max_children_per_node": 64],
    ]
}

private func focusedAXID(_ node: [String: Any]) -> String? {
    if node["focused"] as? Bool == true { return node["id"] as? String }
    for child in node["children"] as? [[String: Any]] ?? [] {
        if let id = focusedAXID(child) { return id }
    }
    return nil
}

private func collectInternalAXControls(_ node: [String: Any], windowDepth: Int) -> [[String: Any]] {
    let role = node["role"] as? String ?? ""
    let isControl = windowDepth > 1 && ["AXButton", "AXCheckBox", "AXRadioButton", "AXTextField", "AXPopUpButton", "AXSlider"].contains(role) && node["visible"] as? Bool == true
    var found = isControl ? [node] : []
    guard found.count < 256 else { return found }
    let children = node["children"] as? [[String: Any]] ?? []
    let childDepth = role == "AXWindow" ? 1 : (windowDepth > 0 ? windowDepth + 1 : 0)
    for child in children {
        found.append(contentsOf: collectInternalAXControls(child, windowDepth: childDepth))
        if found.count >= 256 { break }
    }
    return Array(found.prefix(256))
}

private func countInternalAXControls(_ node: [String: Any], windowDepth: Int) -> Int {
    let role = node["role"] as? String ?? ""
    let own = windowDepth > 1 && ["AXButton", "AXCheckBox", "AXRadioButton", "AXTextField", "AXPopUpButton", "AXSlider"].contains(role) ? 1 : 0
    let children = node["children"] as? [[String: Any]] ?? []
    let childDepth = role == "AXWindow" ? 1 : (windowDepth > 0 ? windowDepth + 1 : 0)
    return own + children.reduce(0) { $0 + countInternalAXControls($1, windowDepth: childDepth) }
}

private func launchGallery(_ gallery: URL, app: URL?, scene: Scene) throws -> (GalleryProcess, ProcessOutputDrain?) {
    guard gallery.path.hasPrefix("/"), FileManager.default.isExecutableFile(atPath: gallery.path) else {
        throw CaptureError.galleryMissing("release Gallery must be an absolute executable path: \(gallery.path)")
    }
    guard let viewport = scene.viewport else {
        throw CaptureError.invalidScene("scene \(scene.id) has no viewport; capture fixture cannot select a deterministic Gallery size")
    }

    var arguments = [
        "--component=\(scene.component_id)",
        "--viewport=\(viewport.width)x\(viewport.height)",
    ]
    switch scene.theme {
    case "light":
        arguments.append("--light")
    case "dark":
        arguments.append("--dark")
    default:
        break
    }
    switch (viewport.width, viewport.height) {
    case (1240, 800), (840, 600):
        break
    default:
        throw CaptureError.invalidScene("scene \(scene.id) requests unsupported deterministic Gallery viewport \(viewport.width)x\(viewport.height)")
    }

    if let app {
        guard app.path.hasPrefix("/"), app.pathExtension == "app",
              FileManager.default.fileExists(atPath: app.path)
        else {
            throw CaptureError.galleryMissing("release Gallery app must be an absolute existing .app bundle: \(app.path)")
        }
        let bundledExecutable = app.appendingPathComponent("Contents/MacOS/tessera-gallery").standardizedFileURL
        guard gallery.standardizedFileURL == bundledExecutable else {
            throw CaptureError.galleryMissing("release Gallery executable must be the tessera-gallery binary inside the supplied .app bundle")
        }
        let existingPIDs = Set(NSWorkspace.shared.runningApplications
            .filter { $0.bundleURL?.standardizedFileURL == app.standardizedFileURL }
            .map(\.processIdentifier))
        let opener = Process()
        opener.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        opener.arguments = ["-n", app.path, "--args"] + arguments
        try opener.run()
        opener.waitUntilExit()
        guard opener.terminationStatus == 0 else {
            throw CaptureError.captureFailed("LaunchServices could not start the release Gallery app")
        }
        for _ in 0..<50 {
            let candidates = NSWorkspace.shared.runningApplications.filter {
                $0.bundleURL?.standardizedFileURL == app.standardizedFileURL
                    && !existingPIDs.contains($0.processIdentifier)
                    && !$0.isTerminated
            }
            if candidates.count == 1, let candidate = candidates.first {
                return (
                    GalleryProcess(
                        processIdentifier: candidate.processIdentifier,
                        arguments: arguments,
                        launchMode: "launchservices_app",
                        isChildProcess: false
                    ),
                    nil
                )
            }
            if candidates.count > 1 {
                throw CaptureError.captureFailed("LaunchServices started more than one new Gallery process for one capture scene")
            }
            Thread.sleep(forTimeInterval: 0.10)
        }
        throw CaptureError.captureFailed("LaunchServices did not report a new Gallery process for the supplied .app bundle")
    }

    let drain = ProcessOutputDrain()
    defer { drain.closeWriteEnds() }

    var actions: posix_spawn_file_actions_t? = nil
    guard posix_spawn_file_actions_init(&actions) == 0 else {
        throw CaptureError.captureFailed("could not initialize release Gallery spawn file actions")
    }
    defer { posix_spawn_file_actions_destroy(&actions) }
    let stdoutRead = drain.stdout.fileHandleForReading.fileDescriptor
    let stdoutWrite = drain.stdout.fileHandleForWriting.fileDescriptor
    let stderrRead = drain.stderr.fileHandleForReading.fileDescriptor
    let stderrWrite = drain.stderr.fileHandleForWriting.fileDescriptor
    guard posix_spawn_file_actions_adddup2(&actions, stdoutWrite, STDOUT_FILENO) == 0,
          posix_spawn_file_actions_adddup2(&actions, stderrWrite, STDERR_FILENO) == 0,
          posix_spawn_file_actions_addclose(&actions, stdoutRead) == 0,
          posix_spawn_file_actions_addclose(&actions, stderrRead) == 0,
          posix_spawn_file_actions_addclose(&actions, stdoutWrite) == 0,
          posix_spawn_file_actions_addclose(&actions, stderrWrite) == 0
    else {
        throw CaptureError.captureFailed("could not route release Gallery output through the isolated capture process")
    }

    var attributes: posix_spawnattr_t? = nil
    guard posix_spawnattr_init(&attributes) == 0 else {
        throw CaptureError.captureFailed("could not initialize release Gallery spawn attributes")
    }
    defer { posix_spawnattr_destroy(&attributes) }
    guard posix_spawnattr_setflags(&attributes, Int16(POSIX_SPAWN_SETPGROUP)) == 0,
          posix_spawnattr_setpgroup(&attributes, 0) == 0
    else {
        throw CaptureError.captureFailed("could not request a dedicated release Gallery process group")
    }

    var argv: [UnsafeMutablePointer<CChar>?] = [strdup(gallery.path)]
    argv.append(contentsOf: arguments.map { strdup($0) })
    argv.append(nil)
    guard argv.dropLast().allSatisfy({ $0 != nil }) else {
        throw CaptureError.captureFailed("could not allocate release Gallery launch arguments")
    }
    defer {
        for argument in argv {
            if let argument { free(argument) }
        }
    }
    var pid: pid_t = 0
    let spawnStatus = posix_spawn(&pid, gallery.path, &actions, &attributes, &argv, environ)
    guard spawnStatus == 0 else {
        throw CaptureError.captureFailed("could not launch release Gallery: \(String(cString: strerror(spawnStatus)))")
    }
    let process = GalleryProcess(
        processIdentifier: pid,
        arguments: arguments,
        launchMode: "direct_executable",
        isChildProcess: true
    )
    guard getpgid(pid) == pid else {
        _ = terminate(process)
        throw CaptureError.captureFailed("release Gallery process group could not be isolated")
    }
    return (process, drain)
}

private func frontWindow(for pid: pid_t) -> WindowObservation? {
    // Direct Makepad launches can report their real native windows through
    // optionAll before WindowServer promotes them to optionOnScreenOnly. Keep
    // the acceptance boundary physical: layer zero, visible alpha, display
    // intersection, and a later screencapture of this exact CGWindowID.
    let options: CGWindowListOption = [.optionAll, .excludeDesktopElements]
    let display = CGDisplayBounds(CGMainDisplayID())
    guard let list = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
        return nil
    }
    let windows = list.compactMap { entry -> WindowObservation? in
        guard (entry[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value == pid,
              (entry[kCGWindowLayer as String] as? NSNumber)?.intValue == 0,
              let number = entry[kCGWindowNumber as String] as? NSNumber,
              let boundsValue = entry[kCGWindowBounds as String],
              let bounds = CGRect(dictionaryRepresentation: boundsValue as! CFDictionary),
              let alpha = (entry[kCGWindowAlpha as String] as? NSNumber)?.doubleValue,
              alpha > 0,
              bounds.intersects(display),
              bounds.width >= 200,
              bounds.height >= 150
        else {
            return nil
        }
        return WindowObservation(
            id: CGWindowID(number.uint32Value),
            bounds: bounds,
            title: entry[kCGWindowName as String] as? String,
            layer: (entry[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0,
            alpha: alpha,
            isOnscreen: (entry[kCGWindowIsOnscreen as String] as? NSNumber)?.boolValue,
            sharingState: (entry[kCGWindowSharingState as String] as? NSNumber)?.intValue
        )
    }
    return windows.max { $0.bounds.width * $0.bounds.height < $1.bounds.width * $1.bounds.height }
}

private func windowMetadata(_ window: WindowObservation, ownerPID: pid_t) -> [String: Any] {
    [
        "window_id": Int(window.id),
        "owner_pid": Int(ownerPID),
        "title": window.title ?? "",
        "layer": window.layer,
        "alpha": window.alpha,
        "is_onscreen": window.isOnscreen.map { $0 as Any } ?? NSNull(),
        "sharing_state": window.sharingState.map { $0 as Any } ?? NSNull(),
        "bounds_points": [
            "x": window.bounds.origin.x,
            "y": window.bounds.origin.y,
            "width": window.bounds.width,
            "height": window.bounds.height,
        ],
        "main_display_bounds_points": [
            "x": CGDisplayBounds(CGMainDisplayID()).origin.x,
            "y": CGDisplayBounds(CGMainDisplayID()).origin.y,
            "width": CGDisplayBounds(CGMainDisplayID()).width,
            "height": CGDisplayBounds(CGMainDisplayID()).height,
        ],
        "capture_selection": "layer_zero_nontransparent_main_display_intersection",
    ]
}

private func waitForStableWindow(_ gallery: GalleryProcess) throws -> WindowObservation {
    var last: WindowObservation?
    var stableObservations = 0
    for _ in 0..<50 {
        if !gallery.isRunning {
            throw CaptureError.galleryExited(gallery.terminationStatus)
        }
        if let candidate = frontWindow(for: gallery.processIdentifier) {
            if let previous = last,
               previous.id == candidate.id,
               abs(previous.bounds.width - candidate.bounds.width) < 0.5,
               abs(previous.bounds.height - candidate.bounds.height) < 0.5 {
                stableObservations += 1
            } else {
                stableObservations = 1
            }
            last = candidate
            if stableObservations >= 4 {
                return candidate
            }
        }
        Thread.sleep(forTimeInterval: 0.20)
    }
    throw CaptureError.windowUnavailable(pid: gallery.processIdentifier)
}

private func decodePixels(_ imageURL: URL) throws -> PixelImage {
    guard let source = CGImageSourceCreateWithURL(imageURL as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else {
        throw CaptureError.imageInvalid("macOS capture did not produce a decodable PNG")
    }
    let width = image.width
    let height = image.height
    guard width > 0, height > 0, width <= 16_384, height <= 16_384 else {
        throw CaptureError.imageInvalid("captured PNG has unsupported dimensions \(width)x\(height)")
    }
    var bytes = [UInt8](repeating: 0, count: width * height * 4)
    let bitmapInfo = CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    guard let context = CGContext(
        data: &bytes,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: bitmapInfo
    ) else {
        throw CaptureError.imageInvalid("could not create an RGBA pixel buffer")
    }
    context.interpolationQuality = .none
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return PixelImage(width: width, height: height, rgba: bytes)
}

private func color(at pixel: Int, in image: PixelImage) -> Color {
    let offset = pixel * 4
    // CGContext byteOrder32Little + premultipliedFirst stores BGRA in memory.
    return Color(
        red: image.rgba[offset + 2],
        green: image.rgba[offset + 1],
        blue: image.rgba[offset],
        alpha: image.rgba[offset + 3]
    )
}

private func channelDelta(_ lhs: Color, _ rhs: Color) -> Int {
    abs(Int(lhs.red) - Int(rhs.red))
        + abs(Int(lhs.green) - Int(rhs.green))
        + abs(Int(lhs.blue) - Int(rhs.blue))
        + abs(Int(lhs.alpha) - Int(rhs.alpha))
}

private func pixelDelta(before: PixelImage, after: PixelImage) -> PixelDelta {
    guard before.width == after.width, before.height == after.height else {
        return PixelDelta(
            dimensionsMatch: false,
            changedPixelCount: 0,
            significantPixelCount: 0,
            maximumChannelDelta: 0,
            boundingRect: nil
        )
    }

    var changed = 0
    var significant = 0
    var maximum = 0
    var minX = before.width
    var minY = before.height
    var maxX = -1
    var maxY = -1

    for pixel in 0..<(before.width * before.height) {
        let delta = channelDelta(color(at: pixel, in: before), color(at: pixel, in: after))
        guard delta > 0 else { continue }
        changed += 1
        maximum = max(maximum, delta)
        // Ignore one-channel anti-aliasing noise. A Button activation must
        // make a visibly material change in the OS screenshot.
        guard delta >= 48 else { continue }
        significant += 1
        let x = pixel % before.width
        let y = pixel / before.width
        minX = min(minX, x)
        minY = min(minY, y)
        maxX = max(maxX, x)
        maxY = max(maxY, y)
    }
    let rect = maxX >= minX && maxY >= minY
        ? Rect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
        : nil
    return PixelDelta(
        dimensionsMatch: true,
        changedPixelCount: changed,
        significantPixelCount: significant,
        maximumChannelDelta: maximum,
        boundingRect: rect
    )
}

private func pixelDeltaRecord(_ delta: PixelDelta) -> [String: Any] {
    var record: [String: Any] = [
        "dimensions_match": delta.dimensionsMatch,
        "changed_pixel_count": delta.changedPixelCount,
        "significant_pixel_count": delta.significantPixelCount,
        "maximum_channel_delta": delta.maximumChannelDelta,
    ]
    record["significant_change_bounds_physical_pixels"] = delta.boundingRect.map { rect in
        ["x": rect.x, "y": rect.y, "width": rect.width, "height": rect.height]
    } ?? NSNull()
    return record
}

private func isMaterialVisualDelta(_ delta: PixelDelta, image: PixelImage) -> Bool {
    delta.dimensionsMatch
        && delta.boundingRect != nil
        && delta.significantPixelCount >= max(80, (image.width * image.height) / 50_000)
}

private func rectOverlapArea(_ lhs: Rect?, _ rhs: Rect?) -> Int {
    guard let lhs, let rhs else { return 0 }
    let left = max(lhs.x, rhs.x)
    let top = max(lhs.y, rhs.y)
    let right = min(lhs.x + lhs.width, rhs.x + rhs.width)
    let bottom = min(lhs.y + lhs.height, rhs.y + rhs.height)
    return max(0, right - left) * max(0, bottom - top)
}

private func significantPixelsOutsideTarget(
    before: PixelImage,
    after: PixelImage,
    target: CGPoint
) -> Int {
    guard before.width == after.width, before.height == after.height else { return 0 }
    let triggerRect = CGRect(
        x: target.x - 220,
        y: target.y - 110,
        width: 440,
        height: 220
    ).intersection(CGRect(x: 0, y: 0, width: before.width, height: before.height))
    var count = 0
    for pixel in 0..<(before.width * before.height) {
        let point = CGPoint(x: pixel % before.width, y: pixel / before.width)
        guard !triggerRect.contains(point) else { continue }
        if channelDelta(color(at: pixel, in: before), color(at: pixel, in: after)) >= 48 {
            count += 1
        }
    }
    return count
}

private func modalTransitionProbe(
    window: WindowObservation,
    process: GalleryProcess,
    output: URL,
    plan: [String: Any],
    capturePixels: PixelImage
) throws -> ModalProbeResult {
    let bridge = try CaptureCoordinateBridge.resolve(window: window, image: capturePixels, plan: plan)
    let clickPoint = bridge.finalCGEventPoint
    let beforeURL = output.appendingPathComponent("modal-before.png")
    let openURL = output.appendingPathComponent("modal-open.png")
    let closedURL = output.appendingPathComponent("modal-closed.png")

    try captureWindow(window, to: beforeURL)
    let before = try decodePixels(beforeURL)
    let clickReadiness = try postClick(
        at: clickPoint,
        process: process,
        window: window,
        stage: "modal_open"
    )
    Thread.sleep(forTimeInterval: plan["settle_interval_seconds"] as? Double ?? 0.30)
    guard let openWindow = frontWindow(for: process.processIdentifier), sameWindow(openWindow, window) else {
        throw CaptureError.windowUnavailable(pid: process.processIdentifier)
    }
    try captureWindow(openWindow, to: openURL)
    let open = try decodePixels(openURL)
    let escapeReadiness = try postKey(
        53,
        process: process,
        window: window,
        stage: "modal_escape"
    )
    Thread.sleep(forTimeInterval: plan["settle_interval_seconds"] as? Double ?? 0.30)
    guard let closedWindow = frontWindow(for: process.processIdentifier), sameWindow(closedWindow, window) else {
        throw CaptureError.windowUnavailable(pid: process.processIdentifier)
    }
    try captureWindow(closedWindow, to: closedURL)
    let closed = try decodePixels(closedURL)

    let openDelta = pixelDelta(before: before, after: open)
    let closeDelta = pixelDelta(before: open, after: closed)
    let closedToBeforeDelta = pixelDelta(before: before, after: closed)
    let openMaterial = isMaterialVisualDelta(openDelta, image: open)
    let closeMaterial = isMaterialVisualDelta(closeDelta, image: closed)
    let overlapArea = rectOverlapArea(openDelta.boundingRect, closeDelta.boundingRect)
    let overlapRequired = max(16, min(open.width, open.height) / 100)
    let openOutsideTrigger = significantPixelsOutsideTarget(before: before, after: open, target: bridge.targetPhysicalPixels)
    let closeOutsideTrigger = significantPixelsOutsideTarget(before: open, after: closed, target: bridge.targetPhysicalPixels)
    let outsideRequired = max(200, (open.width * open.height) / 10_000)
    let closedApproximateBefore = closedToBeforeDelta.dimensionsMatch
        && closedToBeforeDelta.significantPixelCount < max(80, (closed.width * closed.height) / 50_000)
        && closedToBeforeDelta.changedPixelCount < max(500, (closed.width * closed.height) / 100)
    let panelBackdropAppearedThenDisappeared = openDelta.boundingRect != nil
        && closeDelta.boundingRect != nil
        && overlapArea >= overlapRequired
        && openOutsideTrigger >= outsideRequired
        && closeOutsideTrigger >= outsideRequired
    let observed = openMaterial && closeMaterial && panelBackdropAppearedThenDisappeared && closedApproximateBefore

    let beforeHash = fileSha256(beforeURL)
    let openHash = fileSha256(openURL)
    let closedHash = fileSha256(closedURL)
    let hashes = [
        beforeURL.lastPathComponent: beforeHash,
        openURL.lastPathComponent: openHash,
        closedURL.lastPathComponent: closedHash,
    ]
    let steps: [[String: Any]] = [
        [
            "index": 0,
            "stage": "before",
            "action": "capture_before",
            "input_origin": "platform_injected",
            "png": beforeURL.lastPathComponent,
            "png_sha256": beforeHash,
            "coordinate_bridge": bridge.record(),
        ],
        [
            "index": 1,
            "stage": "click",
            "action": "click_primary_probe",
            "input_origin": "platform_injected",
            "point": ["x": clickPoint.x, "y": clickPoint.y],
            "coordinate_bridge": bridge.record(),
            "platform_input_readiness": clickReadiness.record(),
        ],
        [
            "index": 2,
            "stage": "open",
            "action": "capture_open",
            "input_origin": "platform_injected",
            "png": openURL.lastPathComponent,
            "png_sha256": openHash,
            "pixel_delta": pixelDeltaRecord(openDelta),
        ],
        [
            "index": 3,
            "stage": "escape",
            "action": "escape",
            "input_origin": "platform_injected",
            "platform_input_readiness": escapeReadiness.record(),
        ],
        [
            "index": 4,
            "stage": "closed",
            "action": "capture_closed",
            "input_origin": "platform_injected",
            "png": closedURL.lastPathComponent,
            "png_sha256": closedHash,
            "pixel_delta": pixelDeltaRecord(closeDelta),
        ],
    ]
    return ModalProbeResult(
        steps: steps,
        hashes: hashes,
        observed: observed,
        coordinateBridge: bridge.record(),
        transition: [
            "status": observed ? "observed" : "blocked",
            "stage_order": ["before", "click", "open", "escape", "closed"],
            "stages": steps,
            "before_png": beforeURL.lastPathComponent,
            "open_png": openURL.lastPathComponent,
            "closed_png": closedURL.lastPathComponent,
            "before_png_sha256": beforeHash,
            "open_png_sha256": openHash,
            "closed_png_sha256": closedHash,
            "open_delta": pixelDeltaRecord(openDelta),
            "open_to_closed_delta": pixelDeltaRecord(closeDelta),
            "closed_to_before_delta": pixelDeltaRecord(closedToBeforeDelta),
            "open_material_delta": openMaterial,
            "close_material_delta": closeMaterial,
            "panel_backdrop_appeared_then_disappeared": panelBackdropAppearedThenDisappeared,
            "open_changed_pixels_outside_trigger": openOutsideTrigger,
            "close_changed_pixels_outside_trigger": closeOutsideTrigger,
            "required_changed_pixels_outside_trigger": outsideRequired,
            "changed_region_overlap_pixels": overlapArea,
            "required_overlap_pixels": overlapRequired,
            "closed_approximately_before": closedApproximateBefore,
            "observed_requires": [
                "both_open_and_close_material_deltas",
                "same_window_and_valid_coordinate_bridge",
                "panel_backdrop_appears_then_disappears",
                "closed_screenshot_approximately_matches_before",
            ],
        ],
        foregroundPID: escapeReadiness.foregroundPID
    )
}

private func focusRingDelta(
    before: PixelImage,
    after: PixelImage,
    target: [String: Double]
) -> (observation: [String: Any], observed: Bool) {
    let fullDelta = pixelDelta(before: before, after: after)
    guard fullDelta.dimensionsMatch,
          let x = target["x"], let y = target["y"],
          let width = target["width"], let height = target["height"]
    else {
        return (
            [
                "status": "blocked",
                "reason": "focus target or same-size OS screenshots were unavailable",
                "pixel_delta": pixelDeltaRecord(fullDelta),
            ],
            false
        )
    }

    let targetRect = CGRect(
        x: CGFloat(x) * CGFloat(before.width),
        y: CGFloat(y) * CGFloat(before.height),
        width: CGFloat(width) * CGFloat(before.width),
        height: CGFloat(height) * CGFloat(before.height)
    ).intersection(CGRect(x: 0, y: 0, width: before.width, height: before.height))
    guard !targetRect.isNull, targetRect.width > 0, targetRect.height > 0 else {
        return (
            [
                "status": "blocked",
                "reason": "focus target lies outside the OS screenshot",
                "pixel_delta": pixelDeltaRecord(fullDelta),
            ],
            false
        )
    }

    let ringWidth: CGFloat = max(4, min(targetRect.width, targetRect.height) / 10)
    let outer = targetRect.insetBy(dx: -ringWidth, dy: -ringWidth)
        .intersection(CGRect(x: 0, y: 0, width: before.width, height: before.height))
    let inner = targetRect.insetBy(dx: ringWidth, dy: ringWidth)
    var perimeterSignificantPixels = 0
    var perimeterPixels = 0
    for pixel in 0..<(before.width * before.height) {
        let point = CGPoint(x: pixel % before.width, y: pixel / before.width)
        guard outer.contains(point), !inner.contains(point) else { continue }
        perimeterPixels += 1
        if channelDelta(color(at: pixel, in: before), color(at: pixel, in: after)) >= 48 {
            perimeterSignificantPixels += 1
        }
    }
    let requiredPixels = max(24, perimeterPixels / 1_500)
    let observed = fullDelta.dimensionsMatch
        && perimeterSignificantPixels >= requiredPixels
        && fullDelta.significantPixelCount >= requiredPixels
    let physicalTarget = Rect(
        x: Int(targetRect.minX.rounded(.down)),
        y: Int(targetRect.minY.rounded(.down)),
        width: Int(targetRect.width.rounded(.up)),
        height: Int(targetRect.height.rounded(.up))
    )
    return (
        [
            "status": observed ? "observed" : "blocked",
            "source": "distinct platform-injected keyboard focus screenshots of the same CGWindowID",
            "target_rect_physical_pixels": ["x": physicalTarget.x, "y": physicalTarget.y, "width": physicalTarget.width, "height": physicalTarget.height],
            "perimeter_pixel_count": perimeterPixels,
            "perimeter_significant_pixel_count": perimeterSignificantPixels,
            "required_perimeter_significant_pixel_count": requiredPixels,
            "pixel_delta": pixelDeltaRecord(fullDelta),
        ],
        observed
    )
}

private func histogram(_ image: PixelImage) -> [Color: Int] {
    var values: [Color: Int] = [:]
    values.reserveCapacity(512)
    for pixel in 0..<(image.width * image.height) {
        let value = color(at: pixel, in: image)
        guard value.alpha > 0 else { continue }
        values[value, default: 0] += 1
    }
    return values
}

private func scanRuns(image: PixelImage, color target: Color) -> [Rect] {
    let minimumWidth = max(64, image.width / 12)
    var output: [Rect] = []
    var active: Rect?

    func flush() {
        guard let rect = active, rect.width >= minimumWidth, rect.height >= 24 else { return }
        output.append(rect)
    }

    for y in 0..<image.height {
        var bestStart = 0
        var bestLength = 0
        var runStart = 0
        var runLength = 0
        for x in 0..<image.width {
            if color(at: y * image.width + x, in: image) == target {
                if runLength == 0 { runStart = x }
                runLength += 1
                if runLength > bestLength {
                    bestLength = runLength
                    bestStart = runStart
                }
            } else {
                runLength = 0
            }
        }
        guard bestLength >= minimumWidth else {
            flush()
            active = nil
            continue
        }
        let row = Rect(x: bestStart, y: y, width: bestLength, height: 1)
        if let current = active {
            let overlapStart = max(current.x, row.x)
            let overlapEnd = min(current.x + current.width, row.x + row.width)
            let overlap = max(0, overlapEnd - overlapStart)
            let required = Int(Double(min(current.width, row.width)) * 0.80)
            if overlap >= required {
                active = Rect(
                    x: min(current.x, row.x),
                    y: current.y,
                    width: max(current.x + current.width, row.x + row.width) - min(current.x, row.x),
                    height: current.height + 1
                )
            } else {
                flush()
                active = row
            }
        } else {
            active = row
        }
    }
    flush()
    return output
}

private func detectedSurfaces(image: PixelImage, histogram values: [Color: Int]) -> [SurfaceObservation] {
    let total = image.width * image.height
    let commonColors = values
        .filter { $0.key.alpha == 255 && $0.value >= max(1_000, total / 2_000) }
        .sorted { $0.value > $1.value }
        .prefix(24)
    var surfaces: [SurfaceObservation] = []
    for (fill, count) in commonColors {
        for rect in scanRuns(image: image, color: fill) {
            let coversViewport = rect.x <= 2 && rect.y <= 2
                && rect.width >= image.width - 4 && rect.height >= image.height - 4
            guard !coversViewport else { continue }
            let duplicate = surfaces.contains { existing in
                abs(existing.rect.x - rect.x) <= 2 && abs(existing.rect.y - rect.y) <= 2
                    && abs(existing.rect.width - rect.width) <= 2 && abs(existing.rect.height - rect.height) <= 2
            }
            if !duplicate {
                surfaces.append(SurfaceObservation(rect: rect, color: fill, pixelCount: count))
            }
        }
    }
    return surfaces.sorted { $0.rect.width * $0.rect.height > $1.rect.width * $1.rect.height }.prefix(8).map { $0 }
}

private func waitForRenderableCapture(_ initialWindow: WindowObservation, gallery: GalleryProcess, to url: URL) throws -> RenderedCapture {
    var window = initialWindow
    for _ in 0..<20 {
        guard gallery.isRunning else {
            throw CaptureError.galleryExited(gallery.terminationStatus)
        }
        try captureWindow(window, to: url)
        let pixels = try decodePixels(url)
        let counts = histogram(pixels)
        if let dominant = counts.values.max(), counts.count >= 3,
           pixels.width * pixels.height - dominant >= max(500, pixels.width * pixels.height / 1_000) {
            let surfaces = detectedSurfaces(image: pixels, histogram: counts)
            if !surfaces.isEmpty {
                return RenderedCapture(
                    window: window,
                    pixels: pixels,
                    histogram: counts,
                    dominantPixelCount: dominant,
                    surfaces: surfaces
                )
            }
        }
        Thread.sleep(forTimeInterval: 0.25)
        guard let observed = frontWindow(for: gallery.processIdentifier), sameWindow(observed, window) else {
            throw CaptureError.windowUnavailable(pid: gallery.processIdentifier)
        }
        window = observed
    }
    throw CaptureError.geometryUnavailable
}

private func recognizedTextCount(_ imageURL: URL) -> Int? {
    guard let image = NSImage(contentsOf: imageURL),
          let data = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: data),
          let cgImage = bitmap.cgImage
    else {
        return nil
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .fast
    request.usesLanguageCorrection = false
    do {
        try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
        return request.results?.compactMap { $0.topCandidates(1).first?.string }.filter { !$0.isEmpty }.count
    } catch {
        return nil
    }
}

private func jsonData(_ object: Any) throws -> Data {
    try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
}

private func writeJSON(_ object: Any, to url: URL) throws {
    try jsonData(object).write(to: url, options: .atomic)
}

private func requiredJSONValue(_ object: [String: Any], path: [String], label: String) throws -> String {
    var current: Any = object
    for key in path {
        guard let dictionary = current as? [String: Any], let next = dictionary[key] else {
            throw CaptureError.captureFailed("managed package provenance is missing \(label)")
        }
        current = next
    }
    guard let value = current as? String, !value.isEmpty else {
        throw CaptureError.captureFailed("managed package provenance has an invalid \(label)")
    }
    return value
}

private func readJSONObject(_ url: URL, label: String) throws -> [String: Any] {
    guard FileManager.default.fileExists(atPath: url.path) else {
        throw CaptureError.captureFailed("managed package is missing \(label): \(url.path)")
    }
    let data = try Data(contentsOf: url)
    guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        throw CaptureError.captureFailed("managed package has an invalid \(label): \(url.path)")
    }
    return object
}

private func captureProvenance(gallery: URL?, app: URL?) throws -> [String: Any] {
    let environment = ProcessInfo.processInfo.environment
    var provenance: [String: Any] = [
        "source_revision": environment["TESSERA_SOURCE_REVISION"] ?? "unbound",
        "build_key": environment["TESSERA_BUILD_KEY"] ?? "unbound",
        "scene_manifest_sha256": environment["TESSERA_SCENE_MANIFEST_SHA256"] ?? "unbound",
        "binary_sha256": gallery.map(fileSha256) ?? environment["TESSERA_BINARY_SHA256"] ?? "unbound",
    ]
    guard let app, let gallery else {
        return provenance
    }

    let packageDirectory = app.deletingLastPathComponent()
    let manifestURL = packageDirectory.appendingPathComponent("package-manifest.json")
    let buildResultURL = packageDirectory.appendingPathComponent("build-result.json")
    let manifest = try readJSONObject(manifestURL, label: "package-manifest.json")
    let buildResult = try readJSONObject(buildResultURL, label: "build-result.json")
    let manifestHash = fileSha256(manifestURL)
    let buildResultHash = fileSha256(buildResultURL)
    let actualBinaryHash = fileSha256(gallery)
    guard manifestHash != "unavailable", buildResultHash != "unavailable", actualBinaryHash != "unavailable" else {
        throw CaptureError.captureFailed("managed package provenance hashes could not be read")
    }

    let sourceRevision = try requiredJSONValue(buildResult, path: ["source", "revision"], label: "source.revision")
    let sourceTreeState = try requiredJSONValue(buildResult, path: ["source", "tree", "state"], label: "source.tree.state")
    let sourceTreeDigest = try requiredJSONValue(buildResult, path: ["source", "tree", "digest_sha256"], label: "source.tree.digest_sha256")
    let sourceTreeStatus = try requiredJSONValue(buildResult, path: ["source", "tree", "status_sha256"], label: "source.tree.status_sha256")
    let lockfileHash = try requiredJSONValue(buildResult, path: ["source", "cargo_lock", "sha256"], label: "source.cargo_lock.sha256")
    let session = try requiredJSONValue(buildResult, path: ["source", "vws_session"], label: "source.vws_session")
    let buildKey = try requiredJSONValue(buildResult, path: ["build", "key"], label: "build.key")
    let rustToolchain = try requiredJSONValue(buildResult, path: ["build", "rust", "toolchain"], label: "build.rust.toolchain")
    let rustcVersion = try requiredJSONValue(buildResult, path: ["build", "rust", "version"], label: "build.rust.version")
    let buildCommand = try requiredJSONValue(buildResult, path: ["build", "command"], label: "build.command")
    let buildCommandHash = try requiredJSONValue(buildResult, path: ["build", "command_sha256"], label: "build.command_sha256")
    let targetDirectory = try requiredJSONValue(buildResult, path: ["build", "target_dir"], label: "build.target_dir")
    let manifestBinding = try requiredJSONValue(buildResult, path: ["package_manifest", "sha256"], label: "package_manifest.sha256")
    let inputBinaryHash = try requiredJSONValue(buildResult, path: ["artifacts", "input_binary", "sha256"], label: "artifacts.input_binary.sha256")
    let bundleBinaryHash = try requiredJSONValue(buildResult, path: ["artifacts", "bundle_executable", "sha256"], label: "artifacts.bundle_executable.sha256")

    guard manifestBinding == manifestHash,
          try requiredJSONValue(manifest, path: ["source_revision"], label: "package source_revision") == sourceRevision,
          try requiredJSONValue(manifest, path: ["source_tree", "state"], label: "package source_tree.state") == sourceTreeState,
          try requiredJSONValue(manifest, path: ["source_tree", "digest_sha256"], label: "package source_tree.digest_sha256") == sourceTreeDigest,
          try requiredJSONValue(manifest, path: ["source_tree", "status_sha256"], label: "package source_tree.status_sha256") == sourceTreeStatus,
          try requiredJSONValue(manifest, path: ["cargo_lock", "sha256"], label: "package cargo_lock.sha256") == lockfileHash,
          try requiredJSONValue(manifest, path: ["build", "key"], label: "package build.key") == buildKey,
          try requiredJSONValue(manifest, path: ["build", "rust_toolchain"], label: "package build.rust_toolchain") == rustToolchain,
          try requiredJSONValue(manifest, path: ["build", "command_sha256"], label: "package build.command_sha256") == buildCommandHash,
          try requiredJSONValue(manifest, path: ["input_binary", "sha256"], label: "package input_binary.sha256") == inputBinaryHash,
          try requiredJSONValue(manifest, path: ["bundle_executable", "sha256"], label: "package bundle_executable.sha256") == bundleBinaryHash,
          bundleBinaryHash == actualBinaryHash
    else {
        throw CaptureError.captureFailed("managed package provenance does not bind the supplied Gallery executable")
    }
    let declaredSourceRevision = provenance["source_revision"] as? String ?? "unbound"
    let declaredBuildKey = provenance["build_key"] as? String ?? "unbound"
    let declaredBinaryHash = provenance["binary_sha256"] as? String ?? "unbound"
    guard declaredSourceRevision == sourceRevision,
          declaredBuildKey == buildKey,
          declaredBinaryHash == bundleBinaryHash
    else {
        throw CaptureError.captureFailed("capture command provenance does not match the managed package")
    }

    provenance["source_tree_state"] = sourceTreeState
    provenance["source_tree_digest_sha256"] = sourceTreeDigest
    provenance["source_tree_status_sha256"] = sourceTreeStatus
    provenance["lockfile_sha256"] = lockfileHash
    provenance["rust_toolchain"] = rustToolchain
    provenance["rustc_version"] = rustcVersion
    provenance["build_command"] = buildCommand
    provenance["build_command_sha256"] = buildCommandHash
    provenance["managed_target_dir"] = targetDirectory
    provenance["vws_session"] = session
    provenance["package_manifest_sha256"] = manifestHash
    provenance["build_result_sha256"] = buildResultHash
    provenance["input_binary_sha256"] = inputBinaryHash
    provenance["bundle_executable_sha256"] = bundleBinaryHash
    return provenance
}

private func failureRecord(scene: Scene?, gallery: URL?, app: URL?, code: String, message: String) -> [String: Any] {
    var record: [String: Any] = [
        "schema_version": "tessera.full-native.capture/v2",
        "scenario_id": scene?.id ?? "unknown",
        "status": "blocked",
        "blocker": ["code": code, "message": message],
    ]
    if let scene, let viewport = scene.viewport {
        record["request"] = [
            "scene_id": scene.id,
            "component_id": scene.component_id,
            "theme": scene.theme ?? "system",
            "viewport": ["width": viewport.width, "height": viewport.height],
        ]
    }
    record["provenance"] = (try? captureProvenance(gallery: gallery, app: app)) ?? [
        "source_revision": ProcessInfo.processInfo.environment["TESSERA_SOURCE_REVISION"] ?? "unbound",
        "build_key": ProcessInfo.processInfo.environment["TESSERA_BUILD_KEY"] ?? "unbound",
        "scene_manifest_sha256": ProcessInfo.processInfo.environment["TESSERA_SCENE_MANIFEST_SHA256"] ?? "unbound",
        "binary_sha256": gallery.map(fileSha256) ?? ProcessInfo.processInfo.environment["TESSERA_BINARY_SHA256"] ?? "unbound",
    ]
    return record
}

private func terminate(_ process: GalleryProcess) -> Bool {
    let pid = process.processIdentifier
    guard process.isRunning else { return true }
    if process.launchMode == "launchservices_app" {
        process.requestTermination()
    } else {
        _ = kill(-pid, SIGTERM)
    }
    let deadline = Date().addingTimeInterval(3)
    while process.isRunning && Date() < deadline {
        Thread.sleep(forTimeInterval: 0.05)
    }
    if process.isRunning {
        if process.launchMode == "launchservices_app" {
            process.forceTermination()
        } else {
            _ = kill(-pid, SIGKILL)
        }
    }
    process.waitUntilExit()
    return !process.isRunning
}

private func sameWindow(_ lhs: WindowObservation, _ rhs: WindowObservation) -> Bool {
    lhs.id == rhs.id && abs(lhs.bounds.origin.x - rhs.bounds.origin.x) < 0.5
        && abs(lhs.bounds.origin.y - rhs.bounds.origin.y) < 0.5
        && abs(lhs.bounds.width - rhs.bounds.width) < 0.5
        && abs(lhs.bounds.height - rhs.bounds.height) < 0.5
}

private func interactionPlan(for scene: Scene) -> [String: Any] {
    let target: String
    let relativeY: Double
    let postcondition: String
    switch scene.component_id {
    case "button":
        return [
            "status": "blocked",
            "target": "button_run_native_action",
            "capture_point_physical_pixels": ["x": 236.0, "y": 636.0],
            "capture_reference_dimensions": ["width": 2480.0, "height": 1600.0],
            "capture_mapping": "physical point derived from the observed blue Button surface x=76,y=617,width=320,height=39 in the 2x 2480x1600 CGWindow PNG; mapped to current window points before CGEvent injection",
            "focus_target_relative_rect": ["x": 0.02, "y": 0.285, "width": 0.14, "height": 0.06],
            "focus_probe_action": "shift_tab",
            "activation_actions": ["click_primary_probe", "enter", "space"],
            "settle_interval_seconds": 0.25,
            "actions": ["click", "tab", "shift_tab", "enter", "space", "escape", "arrow", "home", "end"],
            "postcondition": "the Run native action Button visibly updates action feedback after a platform click and keyboard activation",
            "postcondition_observed": false,
        ]
    case "modal":
        return [
            "status": "blocked",
            "target": "modal_open_then_escape_close",
            "capture_point_physical_pixels": ["x": 185.0, "y": 784.0],
            "capture_reference_dimensions": ["width": 2480.0, "height": 1600.0],
            "capture_mapping": "physical center of the observed Open modal button in the 2x 2480x1600 CGWindow PNG; mapped to current window points before CGEvent injection",
            "activation_actions": ["click_primary_probe"],
            "keyboard_activation_actions": ["escape"],
            "actions": ["click_primary_probe", "tab", "shift_tab", "escape"],
            "settle_interval_seconds": 0.25,
            "postcondition": "a platform click opens the Modal and platform Escape visibly closes it in the same native window",
            "postcondition_observed": false,
        ]
    case "masonry":
        (target, relativeY, postcondition) = ("masonry_toggle", 0.82, "density layout changes from comfortable to dense")
    case "skeleton":
        (target, relativeY, postcondition) = ("skeleton_loading", 0.60, "placeholder loading state changes visibly")
    case "spin":
        (target, relativeY, postcondition) = ("spin_active", 0.60, "spinner state changes from idle to active")
    case "timeline":
        (target, relativeY, postcondition) = ("timeline_next", 0.60, "current timeline marker advances")
    default:
        return [
            "status": "blocked",
            "target": "component_action",
            "actions": ["click", "tab", "shift_tab", "enter", "space", "escape", "arrow", "home", "end"],
            "postcondition": "component-specific postcondition is not declared for this scene",
        ]
    }
    return [
        "status": "blocked",
        "target": target,
        "relative_point": ["x": 0.16, "y": relativeY],
        "actions": ["click", "tab", "shift_tab", "enter", "space", "escape", "arrow", "home", "end"],
        "postcondition": postcondition,
        "postcondition_observed": false,
    ]
}

private func inputProbe(
    window: WindowObservation,
    process: GalleryProcess,
    output: URL,
    plan: [String: Any],
    capturePixels: PixelImage
) throws -> ([[String: Any]], [String: String], Bool, [String: Any], pid_t, [String: Any]) {
    var steps: [[String: Any]] = []
    var hashes: [String: String] = [:]
    let bridge = try CaptureCoordinateBridge.resolve(window: window, image: capturePixels, plan: plan)
    let clickPoint = bridge.finalCGEventPoint
    var foregroundPID = process.processIdentifier
    let activationActions = Set(plan["activation_actions"] as? [String] ?? [])
    let keyboardActivationActions = Set(plan["keyboard_activation_actions"] as? [String] ?? ["enter", "space"])
    let focusProbeAction = plan["focus_probe_action"] as? String
    let focusTarget = plan["focus_target_relative_rect"] as? [String: Double]
    let settleInterval = plan["settle_interval_seconds"] as? Double ?? 0.15
    var clickActivationObserved = false
    var keyboardActivationObserved = false
    var focusObservation: [String: Any] = [
        "status": "blocked",
        "reason": "no component-specific visual focus probe is declared",
    ]
    let actions: [(String, () throws -> PlatformInputReadiness)] = [
        ("click_primary_probe", { try postClick(at: clickPoint, process: process, window: window, stage: "click_primary_probe") }),
        ("tab", { try postKey(48, process: process, window: window, stage: "tab") }),
        ("shift_tab", { try postKey(48, flags: .maskShift, process: process, window: window, stage: "shift_tab") }),
        ("enter", { try postKey(36, process: process, window: window, stage: "enter") }),
        ("space", { try postKey(49, process: process, window: window, stage: "space") }),
        ("escape", { try postKey(53, process: process, window: window, stage: "escape") }),
        ("arrow_up", { try postKey(126, process: process, window: window, stage: "arrow_up") }),
        ("arrow_down", { try postKey(125, process: process, window: window, stage: "arrow_down") }),
        ("home", { try postKey(115, process: process, window: window, stage: "home") }),
        ("end", { try postKey(119, process: process, window: window, stage: "end") }),
    ]
    let requestedActions = plan["actions"] as? [String] ?? actions.map(\.0)
    let selectedActions = Set(requestedActions.flatMap { action in
        action == "click" ? ["click_primary_probe"] : [action]
    })
    for (index, action) in actions.filter({ selectedActions.contains($0.0) }).enumerated() {
        let stem = String(format: "trace-%02d", index + 1)
        let preURL = output.appendingPathComponent("\(stem)-pre.png")
        let postURL = output.appendingPathComponent("\(stem)-post.png")
        try captureWindow(window, to: preURL)
        let prePixels = try decodePixels(preURL)
        let readiness = try action.1()
        foregroundPID = readiness.foregroundPID
        Thread.sleep(forTimeInterval: settleInterval)
        guard let observed = frontWindow(for: process.processIdentifier), sameWindow(observed, window) else {
            throw CaptureError.windowUnavailable(pid: process.processIdentifier)
        }
        try captureWindow(observed, to: postURL)
        let postPixels = try decodePixels(postURL)
        let preHash = fileSha256(preURL)
        let postHash = fileSha256(postURL)
        hashes[preURL.lastPathComponent] = preHash
        hashes[postURL.lastPathComponent] = postHash
        let delta = pixelDelta(before: prePixels, after: postPixels)
        let activationObserved = activationActions.contains(action.0) && isMaterialVisualDelta(delta, image: postPixels)
        if action.0 == "click_primary_probe" {
            clickActivationObserved = activationObserved
        } else if keyboardActivationActions.contains(action.0) {
            keyboardActivationObserved = keyboardActivationObserved || activationObserved
        }
        if action.0 == focusProbeAction, let focusTarget {
            let focusResult = focusRingDelta(before: prePixels, after: postPixels, target: focusTarget)
            focusObservation = focusResult.observation
            focusObservation["pre_png"] = preURL.lastPathComponent
            focusObservation["post_png"] = postURL.lastPathComponent
            focusObservation["pre_png_sha256"] = preHash
            focusObservation["post_png_sha256"] = postHash
        }
        steps.append([
            "index": index,
            "action": action.0,
            "input_origin": "platform_injected",
            "pre_png": preURL.lastPathComponent,
            "pre_png_sha256": preHash,
            "post_png": postURL.lastPathComponent,
            "post_png_sha256": postHash,
            "postcondition": [
                "same_window_id_pid_bounds": true,
                "process_running": process.isRunning,
                "pixel_delta": pixelDeltaRecord(delta),
                "component_specific_postcondition_observed": activationObserved,
            ],
            "coordinate_bridge": bridge.record(),
            "platform_input_readiness": readiness.record(),
        ])
    }
    return (steps, hashes, clickActivationObserved && keyboardActivationObserved, focusObservation, foregroundPID, bridge.record())
}

private func main() throws {
    var galleryPath: String?
    var galleryAppPath: String?
    var scenePath: String?
    var outPath: String?
    var arguments = Array(CommandLine.arguments.dropFirst())
    while !arguments.isEmpty {
        let flag = arguments.removeFirst()
        guard let value = arguments.first else { usage() }
        switch flag {
        case "--gallery": galleryPath = value
        case "--gallery-app": galleryAppPath = value
        case "--scene": scenePath = value
        case "--out-dir": outPath = value
        default: usage()
        }
        arguments.removeFirst()
    }
    guard let galleryPath, galleryPath.hasPrefix("/"),
          let scenePath, scenePath.hasPrefix("/"),
          let outPath, outPath.hasPrefix("/")
    else {
        usage()
    }

    let output = URL(fileURLWithPath: outPath, isDirectory: true)
    try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
    guard CGPreflightScreenCaptureAccess() else {
        throw CaptureError.captureFailed("screen recording permission is unavailable; refusing to capture without a real platform frame")
    }
    let sceneData = try Data(contentsOf: URL(fileURLWithPath: scenePath))
    let scene = try JSONDecoder().decode(Scene.self, from: sceneData)
    guard let viewport = scene.viewport else {
        throw CaptureError.invalidScene("scene \(scene.id) has no viewport")
    }
    let gallery = URL(fileURLWithPath: galleryPath)
    let galleryApp = galleryAppPath.map { URL(fileURLWithPath: $0) }
    let provenance = try captureProvenance(gallery: gallery, app: galleryApp)
    let (process, outputDrain) = try launchGallery(gallery, app: galleryApp, scene: scene)
    defer { _ = terminate(process) }

    let initialWindow = try waitForStableWindow(process)
    let observationURL = output.appendingPathComponent("window-observation.json")
    try writeJSON(windowMetadata(initialWindow, ownerPID: process.processIdentifier), to: observationURL)
    let pngURL = output.appendingPathComponent("capture.png")
    let rendered = try waitForRenderableCapture(initialWindow, gallery: process, to: pngURL)
    let window = rendered.window
    let pixels = rendered.pixels
    let counts = rendered.histogram
    let dominant = rendered.dominantPixelCount
    let surfaces = rendered.surfaces

    var artifactHashes = [
        "capture.png": fileSha256(pngURL),
        "window-observation.json": fileSha256(observationURL),
    ]
    var plan = interactionPlan(for: scene)
    let steps: [[String: Any]]
    let traceHashes: [String: String]
    let postconditionObserved: Bool
    let focusObservation: [String: Any]
    let foregroundPID: pid_t
    let coordinateBridge: [String: Any]
    let modalTransition: [String: Any]?
    if scene.component_id == "modal" {
        let modalProbe = try modalTransitionProbe(
            window: window,
            process: process,
            output: output,
            plan: plan,
            capturePixels: pixels
        )
        steps = modalProbe.steps
        traceHashes = modalProbe.hashes
        postconditionObserved = modalProbe.observed
        focusObservation = [
            "status": "blocked",
            "reason": "Modal transition capture does not establish the native focus restoration bridge",
        ]
        foregroundPID = modalProbe.foregroundPID
        coordinateBridge = modalProbe.coordinateBridge
        modalTransition = modalProbe.transition
    } else {
        let probe = try inputProbe(
            window: window,
            process: process,
            output: output,
            plan: plan,
            capturePixels: pixels
        )
        steps = probe.0
        traceHashes = probe.1
        postconditionObserved = probe.2
        focusObservation = probe.3
        foregroundPID = probe.4
        coordinateBridge = probe.5
        modalTransition = nil
    }
    var auditedWindowMetadata = windowMetadata(window, ownerPID: process.processIdentifier)
    auditedWindowMetadata["coordinate_bridge"] = coordinateBridge
    try writeJSON(auditedWindowMetadata, to: observationURL)
    artifactHashes["window-observation.json"] = fileSha256(observationURL)
    plan["status"] = postconditionObserved ? "observed" : "blocked"
    plan["postcondition_observed"] = postconditionObserved
    var keyboardTrace: [String: Any] = [
        "status": postconditionObserved ? "observed" : "blocked",
        "input_origin": "platform_injected",
        "steps": steps,
        "ime": "blocked",
        "tab_entered_sidebar": false,
        "enter_activated_catalog_tile": false,
        "focused_ax_id": NSNull(),
        "platform_foreground_pid": Int(foregroundPID),
        "coordinate_bridge": coordinateBridge,
        "reason": postconditionObserved
            ? (scene.component_id == "modal"
                ? "Modal open and Escape close passed the independent transition screenshot checks"
                : "Configured platform click and keyboard activation actions each produced a material screenshot delta")
            : "component-specific postcondition was not proven by a material platform screenshot delta",
        "focus_visual_observation": focusObservation,
    ]
    if let modalTransition {
        keyboardTrace["modal_transition"] = modalTransition
    }
    artifactHashes.merge(traceHashes) { _, new in new }

    let geometry: [String: Any] = [
        "coordinate_space": "capture_png_physical_pixels",
        "capture_window": [
            "window_id": Int(window.id),
            "owner_pid": Int(process.processIdentifier),
            "bounds_points": ["x": window.bounds.origin.x, "y": window.bounds.origin.y, "width": window.bounds.width, "height": window.bounds.height],
        ],
        "coordinate_bridge": coordinateBridge,
        "viewport": ["x": 0, "y": 0, "width": pixels.width, "height": pixels.height],
        // This is the visible page extent of the platform capture. The hook
        // intentionally does not claim an unobservable off-screen scroll size.
        "page_scroll_extent": ["x": 0, "y": 0, "width": pixels.width, "height": pixels.height],
        "surfaces": surfaces.enumerated().map { index, surface in
            [
                "id": "pixel-fill-\(index + 1)",
                "measurement": "contiguous opaque fill detected in capture PNG",
                "fill_rgba": String(format: "#%02x%02x%02x%02x", surface.color.red, surface.color.green, surface.color.blue, surface.color.alpha),
                "matching_pixel_count": surface.pixelCount,
                "outer_rect": ["x": surface.rect.x, "y": surface.rect.y, "width": surface.rect.width, "height": surface.rect.height],
                "content_rect": ["x": surface.rect.x, "y": surface.rect.y, "width": surface.rect.width, "height": surface.rect.height],
                "children": [],
            ] as [String: Any]
        },
    ]
    try writeJSON(geometry, to: output.appendingPathComponent("geometry.json"))
    artifactHashes["geometry.json"] = fileSha256(output.appendingPathComponent("geometry.json"))

    let textCount = recognizedTextCount(pngURL)
    let assertions = Set(scene.assertions ?? [])
    var assertionFacts: [[String: Any]] = [
        ["assertion": "nonblank_pixels", "status": "observed", "facts": ["distinct_opaque_colors": counts.count, "non_dominant_pixel_count": pixels.width * pixels.height - dominant]],
        ["assertion": "layout_in_bounds", "status": "observed", "facts": ["independently_detected_surface_count": surfaces.count]],
        ["assertion": "no_page_horizontal_overflow", "status": "observed_visible_frame_only", "facts": ["visible_page_width": pixels.width, "visible_viewport_width": pixels.width]],
    ]
    if assertions.contains("text_visible") {
        if let textCount, textCount > 0 {
            assertionFacts.append(["assertion": "text_visible", "status": "observed", "facts": ["vision_text_observation_count": textCount]])
        } else {
            assertionFacts.append(["assertion": "text_visible", "status": "blocked", "reason": "Vision could not observe text in the real platform capture"])
        }
    }
    if assertions.contains("focus_visible") {
        if focusObservation["status"] as? String == "observed" {
            assertionFacts.append(["assertion": "focus_visible", "status": "observed", "facts": focusObservation])
        } else {
            assertionFacts.append([
                "assertion": "focus_visible",
                "status": "blocked",
                "reason": "no distinct keyboard-focus OS screenshot established a visible focus ring",
                "facts": focusObservation,
            ])
        }
    }
    if let modalTransition {
        assertionFacts.append([
            "assertion": "modal_open_escape_close",
            "status": modalTransition["status"] as? String ?? "blocked",
            "facts": modalTransition,
        ])
    }
    if scene.suite == "keyboard_focus" {
        assertionFacts.append(["assertion": "keyboard_and_ax", "status": "blocked", "reason": "AX child controls and IME evidence remain blocked until the platform bridge is available"])
    }

    let sourceRevision = provenance["source_revision"] as? String ?? "unbound"
    let buildKey = provenance["build_key"] as? String ?? "unbound"
    let manifestHash = provenance["scene_manifest_sha256"] as? String ?? String(repeating: "0", count: 64)
    let binaryHash = provenance["binary_sha256"] as? String ?? "unbound"
    let ax = axSnapshot(for: process.processIdentifier)
    let groupCleaned = terminate(process)
    let io = outputDrain?.finish() ?? (
        stdout: "",
        stderr: "Gallery launched through LaunchServices; process stdio is unavailable to the capture hook."
    )
    guard groupCleaned else { throw CaptureError.captureFailed("release Gallery process left a residual process") }
    keyboardTrace["focused_ax_id"] = ax["focused_ax_id"] ?? NSNull()
    let runtimeLog = "gallery=\(gallery.path)\nlaunch_mode=\(process.launchMode)\npid=\(process.processIdentifier)\nplatform_foreground_pid=\(foregroundPID)\nargs=\(process.arguments.joined(separator: " "))\nsource_revision=\(sourceRevision)\nbuild_key=\(buildKey)\nscene_manifest_sha256=\(manifestHash)\nbinary_sha256=\(binaryHash)\ntermination_status=\(process.terminationStatus)\nprocess_cleaned=\(groupCleaned)\nstdout=\n\(io.stdout)\nstderr=\n\(io.stderr)\n"
    let runtimeURL = output.appendingPathComponent("runtime.log")
    try Data(runtimeLog.utf8).write(to: runtimeURL, options: .atomic)
    artifactHashes["runtime.log"] = fileSha256(runtimeURL)
    let traceURL = output.appendingPathComponent("keyboard_trace.json")
    try writeJSON(keyboardTrace, to: traceURL)
    artifactHashes["keyboard_trace.json"] = fileSha256(traceURL)
    let axURL = output.appendingPathComponent("ax_snapshot.json")
    try writeJSON(ax, to: axURL)
    artifactHashes["ax_snapshot.json"] = fileSha256(axURL)

    let evidence: [String: Any] = [
        "evidence_id": "macos-window-capture-\(scene.id)",
        "revision": sourceRevision,
        "capture_kind": "gui",
        "platform": [
            "os": ProcessInfo.processInfo.operatingSystemVersionString,
            "capture_backend": "/usr/sbin/screencapture -l<CGWindowID> -o",
            "window_id": Int(window.id),
            "owner_pid": Int(process.processIdentifier),
            "window_title": window.title ?? "",
            "window_observation": windowMetadata(window, ownerPID: process.processIdentifier),
        ],
        "pixel_observations": [
            "width": pixels.width,
            "height": pixels.height,
            "distinct_opaque_colors": counts.count,
            "dominant_color_pixel_count": dominant,
            "non_dominant_pixel_count": pixels.width * pixels.height - dominant,
        ],
        "assertion_facts": assertionFacts,
        "interaction_plan": plan,
        "blocked_capabilities": [
            "AX tree extraction is bounded and fail-closed when the process has no trusted internal controls or focus bridge.",
            "IME evidence is blocked; Unicode CGEvent injection is not an IME assertion.",
            "The visible screenshot cannot establish off-screen page scroll extent.",
        ],
    ]
    var mutableEvidence = evidence
    mutableEvidence["provenance"] = provenance
    if let modalTransition {
        mutableEvidence["modal_transition"] = modalTransition
    }
    mutableEvidence["keyboard_trace"] = keyboardTrace
    mutableEvidence["ax_snapshot"] = ax
    let request: [String: Any] = [
        "scene_id": scene.id,
        "component_id": scene.component_id,
        "theme": scene.theme ?? "system",
        "viewport": ["width": viewport.width, "height": viewport.height],
    ]
    let result: [String: Any] = [
        "schema_version": "tessera.full-native.capture/v2",
        "scenario_id": scene.id,
        "status": "captured",
        "request": request,
        "provenance": provenance,
        "artifact_sha256": artifactHashes,
        "capture_png": "capture.png",
        "geometry_json": "geometry.json",
        "evidence": mutableEvidence,
    ]
    try writeJSON(result, to: output.appendingPathComponent("capture-result.json"))
}

do {
    try main()
} catch {
    let errorMessage = error.localizedDescription
    fputs("capture-macos: \(errorMessage)\n", stderr)
    let args = Array(CommandLine.arguments.dropFirst())
    if let index = args.firstIndex(of: "--out-dir"), args.indices.contains(index + 1) {
        let output = URL(fileURLWithPath: args[index + 1], isDirectory: true)
        try? FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        var scene: Scene?
        if let sceneIndex = args.firstIndex(of: "--scene"), args.indices.contains(sceneIndex + 1),
           let data = try? Data(contentsOf: URL(fileURLWithPath: args[sceneIndex + 1])) {
            scene = try? JSONDecoder().decode(Scene.self, from: data)
        }
        let gallery: URL?
        if let galleryIndex = args.firstIndex(of: "--gallery"), args.indices.contains(galleryIndex + 1) {
            gallery = URL(fileURLWithPath: args[galleryIndex + 1])
        } else {
            gallery = nil
        }
        let app: URL?
        if let appIndex = args.firstIndex(of: "--gallery-app"), args.indices.contains(appIndex + 1) {
            app = URL(fileURLWithPath: args[appIndex + 1])
        } else {
            app = nil
        }
        try? writeJSON(failureRecord(scene: scene, gallery: gallery, app: app, code: "MACOS_CAPTURE_BLOCKED", message: errorMessage), to: output.appendingPathComponent("capture-result.json"))
    }
    exit(2)
}
