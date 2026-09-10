import Foundation
import Vision

var decoded: [String: [String]] = [:]
for path in CommandLine.arguments.dropFirst() {
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    let handler = VNImageRequestHandler(url: URL(fileURLWithPath: path))
    try handler.perform([request])
    decoded[path] = (request.results ?? []).compactMap { $0.payloadStringValue }
}
let output = try JSONSerialization.data(withJSONObject: decoded, options: [.sortedKeys])
FileHandle.standardOutput.write(output)
FileHandle.standardOutput.write(Data("\n".utf8))
