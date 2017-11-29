'use strict';

import React, { Component } from 'react';
import { isNumber, meanBy } from 'lodash';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ListView,
  View,
  DeviceEventEmitter,
  Navigator
} from 'react-native';
import Beacons from 'react-native-beacons-manager';
import MapView from 'react-native-maps';
import RNNode from 'react-native-node';

import { Beacon, trilaterate } from './helpers/trilateration';
import mapStyle from './helpers/mapStyle';

const userLocation = new Array();
userLocation.push = function(){
    if (this.length >= 6) {
        this.shift();
    }
    return Array.prototype.push.apply(this,arguments);
}
userLocation.mean = function () {
  return {
    latitude: meanBy(this, 'latitude'),
    longitude: meanBy(this, 'longitude')
  }
}

class Root extends Component {
  constructor(props) {
    super(props);
    // Create our dataSource which will be displayed in the ListView
    var ds = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2 }
    );
    this.state = {
      // region information
      whitelist: {
        '8ce79713-008d-47fc-b40c-7ccbb3bb19e9': { lat: 1.428723, lng: 103.839217 },
        //{ lat: 1.312377, lng: 103.858576 }
        '6d683042-4970-3258-5832-70494230686d': { lat: 1.312373, lng: 103.858540, minor: 1 },
        '4a4b441c-ebad-4efc-b35f-548b5439c5b1': { lat: 1.312341, lng: 103.858544 },

        // test beacons
        'd1eec23e-d820-4d63-a0c1-4e1a356c5f7f': { lat: 1.429723, lng: 103.849217 },
        '09e34337-ae4c-465f-be8d-f57ea8ad0a92': { lat: 1.427723, lng: 103.859217 },
      },
      // React Native ListView datasource initialization
      dataSource: ds.cloneWithRows([]),
      userLocation,
      markers: [],
      displayData: false,
      statusBarHeight: 1
    };

    this.toggleBeaconData = this.toggleBeaconData.bind(this);
  }

  componentWillMount() {
  const _this = this;

  //Hack to ensure the showsMyLocationButton is shown initially. Idea is to force a repaint
  setTimeout(() => this.setState({ statusBarHeight: 0 }), 500);

  Beacons.detectIBeacons();

  Beacons
    .startRangingBeaconsInRegion('REGION1')
    .then(() => {
      console.log('Beacons ranging started succesfully')
    })
    .catch(
      error => console.log(`Beacons ranging not started, error: ${error}`)
    );
  }

  componentDidMount() {
    const _this = this;
    const whitelist = this.state.whitelist;

    // Start background node process
    RNNode.start()

    // Callback to fire on beaconsDidRange event
    this.beaconsDidRange = DeviceEventEmitter.addListener(
      'beaconsDidRange',
      (data) => {
        console.log(data)
        let beacons = [];
        data.beacons.forEach((beacon, i) => {
          const { uuid, rssi } = beacon;

          if (whitelist[uuid] !== undefined) {
            const { lat, lng } = whitelist[uuid];

            if (whitelist[uuid].minor && whitelist[uuid].minor === 1) {
              return beacons.push(new Beacon(lat, lng, rssi));
            }

            return beacons.push(new Beacon(lat, lng, rssi));
          }
        })

        // Format Mapmarkers
        let markers = [];
        data.beacons.forEach(beacon => {
          const { uuid, distance } = beacon;

          if (whitelist[uuid] !== undefined) {
            const { lat, lng } = whitelist[uuid];
            markers.push({
              latitude: lat,
              longitude: lng,
              distance
            });
          }
        })

        console.log(beacons)

        this.setState({
          dataSource: this.state.dataSource.cloneWithRows(data.beacons),
          markers
        });

        if (beacons.length >= 3) {
          return fetch('http://localhost:3000/', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(beacons)
          })
            .then(res => res.json())
            .then(res => {
              console.log(res)
              return _this.setState({
                userLocation: _this.userLocation.push({
                  latitude: res.lat,
                  longitude: res.lng
                })
              })
            })
            .catch(err => {
              console.log(err)
            })
        }
      }
    );
  }

  componentWillUnMount() {
    RNNode.stop();
    this.beaconsDidRange = null;
  }

  toggleBeaconData() {
    this.setState({
      displayData: !this.state.displayData
    });
  }

  fitPadding() {
    this.map.fitToCoordinates(this.state.markers, {
      edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
      animated: true,
    });
  }

  render() {
    const { dataSource, displayData, markers, userLocation } =  this.state;
    const avgUserLocation = userLocation.mean();
    const userInterpolated = isNumber(avgUserLocation.latitude) && isNumber(avgUserLocation.longitude);
    console.log(`interpolated: ${userInterpolated}, location: ${avgUserLocation.latitude}, ${avgUserLocation.longitude}`)

    return (
      <View style={{
        flex: 1,
        paddingTop: 60,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
        paddingTop: this.state.statusBarHeight
      }}>
        <MapView
          ref={ref => { this.map = ref; }}
          style={styles.map}
          customMapStyle={mapStyle}
          initialRegion={{
            latitude: 1.365984,
            longitude: 103.790502,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsMyLocationButton={true}
          showsUserLocation={true}
          loadingEnabled={true}
        >
          {markers.map((marker, i) => (
            <MapView.Marker
              coordinate={{latitude: marker.latitude, longitude: marker.longitude}}
              key={i}
            />
          ))}
          {
            userInterpolated &&
            <MapView.Marker
              coordinate={avgUserLocation}
              pinColor={'yellow'}
            />
          }
          {markers.map((marker, i) => {
            const colors = ['rgba(77,108,250, 0.5)', 'rgba(222,13,146, 0.5)', 'rgba(68,229,231, 0.5)'];
            const color = colors[i];

            return <MapView.Circle
              center={{latitude: marker.latitude, longitude: marker.longitude}}
              radius={marker.distance}
              key={i}
              fillColor={color}
              strokeColor="rgba(0,0,0,0.5)"
              zIndex={2}
              strokeWidth={2}
            />
          })}
        </MapView>
        <View style={styles.beaconData}>
          {
            this.state.displayData &&
            <ListView
              dataSource={ dataSource }
              enableEmptySections={ true }
              renderRow={this.renderRow}
            />
            }
          <TouchableOpacity
            onPress={() => this.fitPadding()}
            style={[styles.bubble, styles.button]}
          >
            <Text style={styles.buttonText}>My Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {this.toggleBeaconData(); }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Beacon Data</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  renderRow = rowData => {
    return (
      <View style={styles.row}>
        <Text style={styles.smallText}>
          UUID: {rowData.uuid ? rowData.uuid  : 'NA'}
        </Text>
        <Text style={styles.smallText}>
          Major: {rowData.major ? rowData.major : 'NA'}
        </Text>
        <Text style={styles.smallText}>
          Minor: {rowData.minor ? rowData.minor : 'NA'}
        </Text>
        <Text style={styles.smallText}>
          RSSI: {rowData.rssi ? rowData.rssi : 'NA'}
        </Text>
        <Text style={styles.smallText}>
          Proximity: {rowData.proximity ? rowData.proximity : 'NA'}
        </Text>
        <Text style={styles.smallText}>
          Distance: {rowData.accuracy ? rowData.accuracy.toFixed(2) : 'NA'}m
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  headline: {
    fontSize: 20,
    paddingTop: 20,
    color: '#fff'
  },
  row: {
    padding: 8,
    paddingBottom: 16
  },
  smallText: {
    fontSize: 11,
    color: '#fff'
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    flex: 1
  },
  beaconData: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    marginTop: 15
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  button: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 5,
    width: 200
  },
  buttonText: {
    fontSize: 18,
    color: '#000',
    textAlign: 'center'
  }
});

export default Root;