import CoreBluetooth
import Flutter

/// The P21's BLE command endpoint. All state and callbacks live on the main queue.
final class P21PrinterBridge: NSObject, FlutterPlugin, CBCentralManagerDelegate, CBPeripheralDelegate {
  private var central: CBCentralManager!
  private var devices: [UUID: CBPeripheral] = [:]
  private var printer: CBPeripheral?
  private var writer: CBCharacteristic?
  private var reader: CBCharacteristic?
  private var pending: FlutterResult?
  private var operation = ""
  private var deadline: DispatchWorkItem?
  private var scanTimer: DispatchWorkItem?
  private var received = Data()
  private var outgoing = Data()
  private var offset = 0
  private var pumpScheduled = false
  private var generation = 0
  private var afterWrite: (() -> Void)?
  private var printArguments: [String: Any]?
  private var printStarted = false
  private let serviceID = CBUUID(string: "FF00")

  static func register(with registrar: FlutterPluginRegistrar) {
    let instance = P21PrinterBridge()
    let channel = FlutterMethodChannel(name: "grookai/p21", binaryMessenger: registrar.messenger())
    registrar.addMethodCallDelegate(instance, channel: channel)
  }

  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    if call.method == "disconnect" {
      fail("cancelled", printStarted ? "Printing was interrupted. Check the label before printing again." : "Printer disconnected.")
      disconnect()
      result(nil)
      return
    }
    guard pending == nil else {
      result(FlutterError(code: "busy", message: "A printer operation is already running.", details: nil))
      return
    }
    guard ["scan", "connect", "status", "printLabel"].contains(call.method) else {
      result(FlutterMethodNotImplemented)
      return
    }
    pending = result
    operation = call.method
    printStarted = false
    received.removeAll()
    let token = generation
    let timeout = DispatchWorkItem { [weak self] in
      guard let self, self.generation == token else { return }
      self.fail("timeout", self.printStarted
        ? "The connection timed out. Check the label before printing again."
        : "P21 did not respond. Disconnect it in Nelko or nRF Connect, then try again.")
      self.disconnect()
    }
    deadline = timeout
    DispatchQueue.main.asyncAfter(deadline: .now() + 25, execute: timeout)
    let args = call.arguments as? [String: Any] ?? [:]
    if central == nil {
      guard call.method == "scan" else { fail("not_connected", "Find and select your P21 first."); return }
      central = CBCentralManager(delegate: self, queue: .main)
      return
    }
    guard central.state == .poweredOn else { reportBluetoothState(); return }
    switch call.method {
    case "scan": scan()
    case "connect":
      guard let id = args["id"] as? String, let uuid = UUID(uuidString: id), let found = devices[uuid] else {
        fail("not_found", "Find your P21 again before connecting."); return
      }
      if let old = printer, old.identifier != uuid { central.cancelPeripheralConnection(old) }
      printer = found
      writer = nil
      reader = nil
      found.delegate = self
      if found.state == .connected { found.discoverServices([serviceID]) }
      else { central.connect(found) }
    case "status": requestStatus()
    case "printLabel":
      guard let bitmap = args["bitmap"] as? FlutterStandardTypedData,
        let rows = args["rows"] as? Int, let width = args["widthMm"] as? Int,
        let length = args["lengthMm"] as? Int,
        width == 14, length == 40, rows == 284,
        bitmap.data.count == 12 * rows else {
        fail("invalid_label", "This label layout is not supported by the P21."); return
      }
      printArguments = args
      requestStatus()
    default: break
    }
  }

  private func reportBluetoothState() {
    switch central.state {
    case .poweredOn: if operation == "scan" { scan() }
    case .unknown, .resetting: break // Wait for the delegate or bounded timeout.
    case .unauthorized: fail("permission", "Allow Bluetooth for Grookai in iPhone Settings.")
    case .poweredOff: fail("bluetooth_off", "Turn on Bluetooth on your iPhone, then find the printer again.")
    default: fail("unsupported", "Bluetooth printing is unavailable on this device.")
    }
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    if central.state != .poweredOn && printer != nil {
      if printStarted { fail("disconnected", "Bluetooth stopped during printing. Check the label before printing again.") }
      disconnect()
    }
    reportBluetoothState()
  }

  private func scan() {
    guard scanTimer == nil else { return }
    devices.removeAll()
    for device in central.retrieveConnectedPeripherals(withServices: [serviceID]) where isP21(device.name) {
      devices[device.identifier] = device
    }
    central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    let token = generation
    let timer = DispatchWorkItem { [weak self] in
      guard let self, self.generation == token else { return }
      self.central.stopScan()
      self.complete(self.devices.values.sorted { $0.identifier.uuidString < $1.identifier.uuidString }.map {
        ["id": $0.identifier.uuidString, "name": $0.name ?? "P21"]
      })
    }
    scanTimer = timer
    DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: timer)
  }

  private func isP21(_ name: String?) -> Bool {
    let name = (name ?? "").uppercased()
    return name == "P21" || name.hasPrefix("P21-") || name.hasPrefix("P21_") || name == "NELKO P21"
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any], rssi RSSI: NSNumber) {
    if operation == "scan" && (isP21(peripheral.name) || isP21(advertisementData[CBAdvertisementDataLocalNameKey] as? String)) {
      devices[peripheral.identifier] = peripheral
    }
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    guard peripheral == printer, operation == "connect" else { return }
    peripheral.discoverServices([serviceID])
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    guard peripheral == printer else { return }
    fail("connection_failed", "Could not connect to P21. Disconnect it in other printer apps and try again.")
    disconnect()
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    guard peripheral == printer else { return }
    fail("disconnected", printStarted ? "P21 disconnected. Check the label before printing again." : "P21 disconnected. Find the printer again.")
    printer = nil; writer = nil; reader = nil
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard peripheral == printer, operation == "connect" else { return }
    guard error == nil, let service = peripheral.services?.first(where: { $0.uuid == serviceID }) else {
      fail("unsupported_printer", "This printer does not expose the expected P21 service."); disconnect(); return
    }
    peripheral.discoverCharacteristics([CBUUID(string: "FF02"), CBUUID(string: "FF01")], for: service)
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    guard peripheral == printer, operation == "connect" else { return }
    writer = service.characteristics?.first { $0.uuid == CBUUID(string: "FF02") && $0.properties.contains(.writeWithoutResponse) }
    reader = service.characteristics?.first { $0.uuid == CBUUID(string: "FF01") && $0.properties.contains(.notify) }
    guard error == nil, writer != nil, let reader else {
      fail("unsupported_printer", "P21's printing channels are unavailable."); disconnect(); return
    }
    peripheral.setNotifyValue(true, for: reader)
  }

  func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
    guard peripheral == printer, characteristic == reader, operation == "connect" else { return }
    guard error == nil, characteristic.isNotifying else {
      fail("notifications", "Cannot receive P21 status. Reconnect the printer."); disconnect(); return
    }
    received.removeAll()
    transmit(Data("CONFIG?\r\n".utf8))
  }

  private func requestStatus() {
    guard printer?.state == .connected, writer != nil, reader?.isNotifying == true else {
      fail("not_connected", "Find and select your P21 first."); return
    }
    received.removeAll()
    // P21 extended status includes readiness, roll dimensions, and CRC-16.
    transmit(Data([0x1b, 0x21, 0x6f, 0x0d, 0x0a]))
  }

  func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    guard peripheral == printer, characteristic == reader, pending != nil else { return }
    guard error == nil, let value = characteristic.value else {
      fail("read_failed", "Could not read P21 status. Reconnect the printer."); return
    }
    received.append(value)
    if received.count > 1024 { fail("invalid_response", "P21 returned an unexpected response."); disconnect(); return }
    if operation == "connect" {
      guard received.count >= 19 else { return }
      guard received.starts(with: Data("CONFIG ".utf8)), received.suffix(2) == Data([13, 10]), received[7] == 0, received[8] == 203 else {
        fail("unsupported_printer", "This P21 firmware or resolution is not supported."); disconnect(); return
      }
      complete(["name": peripheral.name ?? "P21"])
      return
    }
    guard operation == "status" || (operation == "printLabel" && !printStarted), received.count >= 16 else { return }
    let packet = Array(received.prefix(16))
    guard Self.validStatus(packet) else { fail("invalid_status", "Could not verify P21 status. Reconnect and try again."); disconnect(); return }
    let status: [String: Any] = ["state": Int(packet[0]), "widthMm": Int(packet[13]), "lengthMm": Int(packet[11]), "paperType": Int(packet[7])]
    if operation == "status" { complete(status); return }
    guard packet[0] == 0 else {
      let message = packet[0] & 1 != 0 ? "Close the printer lid." : packet[0] & 4 != 0 ? "Load labels in the printer." : "P21 is busy or not ready. Check the printer and try again."
      fail("printer_not_ready", message); return
    }
    guard let args = printArguments, let width = args["widthMm"] as? Int,
      let length = args["lengthMm"] as? Int, let rows = args["rows"] as? Int,
      let bitmap = args["bitmap"] as? FlutterStandardTypedData else { fail("invalid_label", "Label data is missing."); return }
    guard packet[13] == width, packet[11] == length, packet[7] == 1 else {
      fail("roll_changed", "The loaded roll does not match this preview. Reconnect to read its size again."); return
    }
    var job = Data("SIZE \(width) mm,\(length) mm\r\nGAP 5 mm,0 mm\r\nDIRECTION 1,1\r\nDENSITY 10\r\nCLS\r\nBITMAP 0,0,12,\(rows),1,".utf8)
    job.append(bitmap.data)
    job.append(Data("\r\nPRINT 1\r\n".utf8))
    printStarted = true
    transmit(job) { [weak self] in
      guard let self else { return }
      self.complete(["state": "sent", "bytesSent": job.count])
    }
  }

  static func validStatus(_ bytes: [UInt8]) -> Bool {
    guard bytes.count == 16 else { return false }
    var crc: UInt16 = 0xffff
    for byte in bytes.prefix(14) {
      crc ^= UInt16(byte)
      for _ in 0..<8 { crc = crc & 1 == 1 ? (crc >> 1) ^ 0xa001 : crc >> 1 }
    }
    return (UInt16(bytes[14]) << 8 | UInt16(bytes[15])) == crc
  }

  private func transmit(_ data: Data, completion: (() -> Void)? = nil) {
    guard outgoing.isEmpty else { fail("busy", "Printer is still receiving data."); return }
    outgoing = data; offset = 0; afterWrite = completion
    pump()
  }

  private func pump() {
    guard !pumpScheduled, pending != nil, let printer, printer.state == .connected,
      let writer, !outgoing.isEmpty, printer.canSendWriteWithoutResponse else { return }
    let end = min(outgoing.count, offset + min(128, printer.maximumWriteValueLength(for: .withoutResponse)))
    guard end > offset else { fail("write_failed", "P21 cannot receive label data."); return }
    printer.writeValue(outgoing.subdata(in: offset..<end), for: writer, type: .withoutResponse)
    offset = end
    if offset == outgoing.count {
      outgoing.removeAll()
      let done = afterWrite; afterWrite = nil
      done?()
      return
    }
    pumpScheduled = true
    let token = generation
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.02) { [weak self] in
      guard let self, self.generation == token else { return }
      self.pumpScheduled = false
      self.pump()
    }
  }

  func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) {
    if peripheral == printer { pump() }
  }

  private func complete(_ value: Any?) {
    let callback = pending
    pending = nil; operation = ""; generation += 1
    deadline?.cancel(); deadline = nil
    scanTimer?.cancel(); scanTimer = nil
    central?.stopScan()
    outgoing.removeAll(); received.removeAll(); offset = 0; afterWrite = nil
    pumpScheduled = false; printArguments = nil; printStarted = false
    callback?(value)
  }

  private func fail(_ code: String, _ message: String) {
    complete(FlutterError(code: code, message: message, details: nil))
  }

  private func disconnect() {
    if let printer { central?.cancelPeripheralConnection(printer) }
    printer = nil; writer = nil; reader = nil
  }
}
