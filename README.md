# React Native Beacons

<img src="https://s9.postimg.org/e803bftxr/ble.png" width="200">

Forked from (https://github.com/MacKentoch/reactNativeBeaconExample).

React Native app for indoor positioning using BLE beacons. Displays your relative position to the BLE beacons on a map. I couldn't find any accurate trilateration libraries, so I hacked this together using linear interpolation.

Note that the iOS version is untested; Android works fine but you have to use a real phone because emulators do not support bluetooth capabilities.

### Getting Started (Android)
- Enable Developer Mode and turn on USB debugging
- `react-native run-android`
- Turn on your BLE beacons. Alternatively, use a [simulator](https://play.google.com/store/apps/details?id=net.alea.beaconsimulator&hl=en).
- Register BLE beacons using the form

### Considerations
- Use proper trilateration
- Monitor Web Blueooth [spec](https://developers.google.com/web/updates/2015/07/interact-with-ble-devices-on-the-web)
