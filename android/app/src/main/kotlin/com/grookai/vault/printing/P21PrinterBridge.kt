package com.grookai.vault.printing

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.bluetooth.*
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.util.UUID

/** Foreground, bounded P21 transport. Status and all writes are serialized on
 * main; successful transmission is reported as sent, never as physical output.
 * Uses the verified iOS protocol, with Android GATT callback backpressure.
 */
@SuppressLint("MissingPermission")
class P21PrinterBridge(private val activity: Activity, engine: FlutterEngine) {
    private val channel = MethodChannel(engine.dartExecutor.binaryMessenger, "grookai/p21")
    private val handler = Handler(Looper.getMainLooper())
    private val adapter get() = activity.getSystemService(BluetoothManager::class.java)?.adapter
    private val devices = linkedMapOf<String, BluetoothDevice>()
    private var gatt: BluetoothGatt? = null
    private var writer: BluetoothGattCharacteristic? = null
    private var reader: BluetoothGattCharacteristic? = null
    private var pending: MethodChannel.Result? = null
    private var operation = ""
    private var deferred: MethodCall? = null
    private var generation = 0
    private var incoming = ByteArrayOutputStream()
    private var outgoing = byteArrayOf()
    private var offset = 0
    private var writing = false
    private var afterWrite: (() -> Unit)? = null
    private var printBitmap: ByteArray? = null
    private var printStarted = false
    private var responseAccepted = false
    private val serviceId = uuid("ff00")
    private val cccId = uuid("2902")

    init { channel.setMethodCallHandler(::handle) }
    private fun uuid(short: String) = UUID.fromString("0000$short-0000-1000-8000-00805f9b34fb")
    private fun permissions() = if (Build.VERSION.SDK_INT >= 31) arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT) else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
    private fun permitted() = permissions().all { activity.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }
    fun onPermissionsResult(requestCode: Int): Boolean {
        if (requestCode != PERMISSION_REQUEST) return false
        val call = deferred
        deferred = null
        if (pending != null && call != null) {
            if (permitted()) execute(call) else fail("permission", "Allow Nearby devices for grookai in Android Settings to find your P21.")
        }
        return true
    }
    private fun handle(call: MethodCall, result: MethodChannel.Result) {
        if (call.method == "disconnect") { fail("cancelled", interrupted()); disconnect(); result.success(null); return }
        if (call.method !in listOf("scan", "connect", "status", "printLabel")) { result.notImplemented(); return }
        if (pending != null) { result.error("busy", "A printer operation is already running.", null); return }
        pending = result; operation = call.method; printStarted = false; responseAccepted = false; incoming.reset()
        if (!permitted()) {
            if (call.method != "scan") { fail("permission", "Find your printer and allow Nearby devices first."); return }
            deferred = call
            timeout(90000)
            activity.requestPermissions(permissions(), PERMISSION_REQUEST)
        } else execute(call)
    }
    private fun execute(call: MethodCall) {
        timeout(25000)
        if (adapter?.isEnabled != true) { fail("bluetooth_off", "Turn on Bluetooth, then find your printer again."); return }
        when (call.method) {
            "scan" -> scan()
            "connect" -> {
                val device = devices[call.argument<String>("id")]
                if (device == null) { fail("not_found", "Find your P21 again before connecting."); return }
                disconnect()
                gatt = device.connectGatt(activity, false, callback, BluetoothDevice.TRANSPORT_LE)
            }
            "status" -> requestStatus()
            "printLabel" -> {
                val bitmap = call.argument<ByteArray>("bitmap")
                if (call.argument<Int>("widthMm") != 14 || call.argument<Int>("lengthMm") != 40 || call.argument<Int>("rows") != 284 || bitmap?.size != 12 * 284) {
                    fail("invalid_label", "This label layout is not supported by the P21."); return
                }
                printBitmap = bitmap
                requestStatus()
            }
        }
    }
    private fun timeout(ms: Long) {
        val token = ++generation
        handler.postDelayed({ if (token == generation && pending != null) { fail("timeout", interrupted()); disconnect() } }, ms)
    }
    private fun interrupted() = if (printStarted) "Printing was interrupted. Check the physical label before printing again." else "P21 did not finish. Disconnect it in other printer apps and try again."
    private fun isP21(name: String?): Boolean {
        val n = name?.uppercase() ?: ""
        return n == "P21" || n == "NELKO P21" || n.startsWith("P21-") || n.startsWith("P21_")
    }
    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(type: Int, result: ScanResult) { handler.post {
            if (operation == "scan" && (isP21(result.scanRecord?.deviceName) || isP21(result.device.name))) devices[result.device.address] = result.device
        } }
        override fun onScanFailed(errorCode: Int) { handler.post { if (operation == "scan") fail("scan_failed", "Could not search for P21. Check Bluetooth and try again.") } }
    }
    private fun scan() {
        devices.clear()
        adapter?.bondedDevices?.filter { isP21(it.name) }?.forEach { devices[it.address] = it }
        val scanner = adapter?.bluetoothLeScanner ?: run { fail("unsupported", "Bluetooth printing is unavailable."); return }
        scanner.startScan(scanCallback)
        val token = generation
        handler.postDelayed({ if (token == generation && operation == "scan") {
            scanner.stopScan(scanCallback)
            complete(devices.entries.sortedBy { it.key }.map { mapOf("id" to it.key, "name" to (it.value.name ?: "P21")) })
        } }, 5000)
    }
    private val callback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) { handler.post {
            if (g !== gatt) return@post
            if (status == BluetoothGatt.GATT_SUCCESS && newState == BluetoothProfile.STATE_CONNECTED && operation == "connect") {
                if (!g.discoverServices()) { fail("connection_failed", "Could not inspect P21. Reconnect and try again."); disconnect() }
            } else if (status != BluetoothGatt.GATT_SUCCESS || newState == BluetoothProfile.STATE_DISCONNECTED) { fail("disconnected", interrupted()); disconnect() }
        } }
        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) { handler.post {
            if (g !== gatt || operation != "connect") return@post
            val service = g.getService(serviceId)
            writer = service?.getCharacteristic(uuid("ff02"))
            reader = service?.getCharacteristic(uuid("ff01"))
            val w = writer; val r = reader
            if (status != BluetoothGatt.GATT_SUCCESS || w == null || r == null || w.properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE == 0 || r.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY == 0) {
                fail("unsupported_printer", "This printer does not expose the verified P21 channels."); disconnect(); return@post
            }
            val descriptor = r.getDescriptor(cccId)
            if (descriptor == null || !g.setCharacteristicNotification(r, true)) { fail("notifications", "Could not receive P21 status."); disconnect(); return@post }
            @Suppress("DEPRECATION")
            val sent = if (Build.VERSION.SDK_INT >= 33) g.writeDescriptor(descriptor, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE) == BluetoothStatusCodes.SUCCESS else {
                descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE; g.writeDescriptor(descriptor)
            }
            if (!sent) { fail("notifications", "Could not subscribe to P21 status."); disconnect() }
        } }
        override fun onDescriptorWrite(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) { handler.post {
            if (g !== gatt || operation != "connect" || descriptor.uuid != cccId) return@post
            if (status != BluetoothGatt.GATT_SUCCESS) { fail("notifications", "Could not subscribe to P21 status."); disconnect() }
            else transmit("CONFIG?\r\n".toByteArray())
        } }
        override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) { received(g, characteristic, value.copyOf()) }
        @Deprecated("Legacy Android callback")
        override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) { received(g, characteristic, characteristic.value.copyOf()) }
        override fun onCharacteristicWrite(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) { handler.post {
            if (g !== gatt || characteristic.uuid != writer?.uuid || pending == null || !writing) return@post
            writing = false
            if (status != BluetoothGatt.GATT_SUCCESS) { fail("write_failed", interrupted()); disconnect(); return@post }
            if (offset == outgoing.size) { outgoing = byteArrayOf(); val done = afterWrite; afterWrite = null; done?.invoke() }
            else { val token = generation; handler.postDelayed({ if (token == generation) pump() }, 20) }
        } }
    }
    private fun requestStatus() {
        if (gatt == null || writer == null || reader == null) { fail("not_connected", "Find and select your P21 first."); return }
        incoming.reset()
        transmit(byteArrayOf(0x1b, 0x21, 0x6f, 0x0d, 0x0a))
    }
    private fun received(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, bytes: ByteArray) { handler.post {
        if (g !== gatt || characteristic.uuid != reader?.uuid || pending == null || responseAccepted) return@post
        incoming.write(bytes)
        val data = incoming.toByteArray()
        if (data.size > 1024) { fail("invalid_response", "P21 returned an unexpected response."); disconnect(); return@post }
        if (operation == "connect") {
            if (data.size < 19) return@post
            if (!data.take(7).toByteArray().contentEquals("CONFIG ".toByteArray()) || data[7].toInt() != 0 || (data[8].toInt() and 255) != 203 || !data.takeLast(2).toByteArray().contentEquals(byteArrayOf(13,10))) {
                fail("unsupported_printer", "This P21 firmware or resolution is unsupported."); disconnect()
            } else { responseAccepted = true; whenIdle(generation) { complete(mapOf("name" to (g.device.name ?: "P21"))) } }
            return@post
        }
        if (operation !in listOf("status", "printLabel") || printStarted || data.size < 16) return@post
        val packet = data.take(16).toByteArray()
        if (!validStatus(packet)) { fail("invalid_status", "Could not verify P21 status. Reconnect and try again."); disconnect(); return@post }
        fun at(i: Int) = packet[i].toInt() and 255
        if (operation == "status") { responseAccepted = true; whenIdle(generation) { complete(mapOf("state" to at(0), "widthMm" to at(13), "lengthMm" to at(11), "paperType" to at(7))) }; return@post }
        if (at(0) != 0) { fail("printer_not_ready", "Check the lid, loaded labels and readiness, then refresh."); return@post }
        if (at(13) != 14 || at(11) != 40 || at(7) != 1) { fail("roll_changed", "Load a 14 × 40 mm gapped roll matching the preview."); return@post }
        val bitmap = printBitmap ?: run { fail("invalid_label", "Label data is missing."); return@post }
        val job = "SIZE 14 mm,40 mm\r\nGAP 5 mm,0 mm\r\nDIRECTION 1,1\r\nDENSITY 10\r\nCLS\r\nBITMAP 0,0,12,284,1,".toByteArray() + bitmap + "\r\nPRINT 1\r\n".toByteArray()
        // A response can precede Android's command-write callback. Serialize it.
        responseAccepted = true
        whenIdle(generation) {
            printStarted = true
            transmit(job) { complete(mapOf("state" to "sent", "bytesSent" to job.size)) }
        }
    } }
    private fun whenIdle(token: Int, action: () -> Unit) {
        if (token != generation || pending == null) return
        if (writing || outgoing.isNotEmpty()) { handler.postDelayed({ whenIdle(token, action) }, 20); return }
        action()
    }
    private fun transmit(bytes: ByteArray, completion: (() -> Unit)? = null) {
        if (outgoing.isNotEmpty() || writing) { fail("busy", "P21 is still receiving data."); disconnect(); return }
        outgoing = bytes; offset = 0; afterWrite = completion; pump()
    }
    private fun pump() {
        val g = gatt; val w = writer
        if (pending == null || writing || outgoing.isEmpty() || g == null || w == null) return
        // ATT's default 23-byte MTU guarantees 20-byte payloads. Keeping that
        // floor avoids truncation on printers that decline larger MTUs.
        val end = minOf(outgoing.size, offset + 20)
        val chunk = outgoing.copyOfRange(offset, end)
        writing = true
        @Suppress("DEPRECATION")
        val sent = if (Build.VERSION.SDK_INT >= 33) g.writeCharacteristic(w, chunk, BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE) == BluetoothStatusCodes.SUCCESS else {
            w.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE; w.value = chunk; g.writeCharacteristic(w)
        }
        if (!sent) { writing = false; fail("write_failed", interrupted()); disconnect(); return }
        offset = end
    }
    private fun complete(value: Any?) {
        val result = pending; pending = null; operation = ""; deferred = null; generation++
        if (permitted()) adapter?.bluetoothLeScanner?.stopScan(scanCallback)
        outgoing = byteArrayOf(); incoming.reset(); writing = false; offset = 0; afterWrite = null; printBitmap = null; printStarted = false
        result?.success(value)
    }
    private fun fail(code: String, message: String) {
        val result = pending; pending = null
        complete(null)
        disconnect()
        result?.error(code, message, null)
    }
    private fun disconnect() { val old = gatt; gatt = null; writer = null; reader = null; old?.disconnect(); old?.close() }
    fun close() { fail("cancelled", interrupted()); disconnect(); channel.setMethodCallHandler(null) }
    companion object {
        const val PERMISSION_REQUEST = 7812
        fun validStatus(bytes: ByteArray): Boolean {
            if (bytes.size != 16) return false
            var crc = 0xffff
            for (byte in bytes.take(14)) { crc = crc xor (byte.toInt() and 255); repeat(8) { crc = if (crc and 1 == 1) (crc ushr 1) xor 0xa001 else crc ushr 1 } }
            return (((bytes[14].toInt() and 255) shl 8) or (bytes[15].toInt() and 255)) == crc
        }
    }
}
