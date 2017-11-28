'use strict';

import React, { Component } from 'react';
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

import { Beacon, trilaterate } from './helpers/trilateration';
import mapStyle from './helpers/mapStyle';

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
        '8ce79713-008d-47fc-b40c-7ccbb3bb19e9': { lat: 1.429993, lng: 103.849302 },
        '09e34337-ae4c-465f-be8d-f57ea8ad0a92': { lat: 1.429937, lng: 103.849295 },
        'd1eec23e-d820-4d63-a0c1-4e1a356c5f7f': { lat: 1.429954, lng: 103.849396 }
      },
      // React Native ListView datasource initialization
      dataSource: ds.cloneWithRows([]),
      userLocation: {},
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
    //
    // component state aware here - attach events
    //
    // Ranging:
    const _this = this;
    const whitelist = this.state.whitelist;

    this.beaconsDidRange = DeviceEventEmitter.addListener(
      'beaconsDidRange',
      (data) => {
        if (data.beacons.length >= 3) {
          // Beacon trilateration
          const beacons = data.beacons.map(beacon => {
            const { uuid, distance } = beacon;
            const { lat, lng } = whitelist[uuid];

            return new Beacon(lat, lng, distance)
          })

          // Format User Location
          const [userLat, userLng] = trilaterate(beacons);
          const userLocation = {
            latitude: userLat,
            longitude: userLng
          }

          // Format Mapmarkers
          const markers = data.beacons.map(beacon => {
            const { uuid } = beacon;
            const { lat, lng } = whitelist[uuid];

            return {
              latitude: lat,
              longitude: lng,
            };
          })

          return this.setState({
            dataSource: this.state.dataSource.cloneWithRows(data.beacons),
            userLocation,
            markers
          });
        }

        return null;
      }
    );
  }

  componentWillUnMount() {
    this.beaconsDidRange = null;
  }

  toggleBeaconData() {
    this.setState({
      displayData: !this.state.displayData
    });
  }

  render() {
    const { dataSource, displayData, markers, userLocation } =  this.state;

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
              coordinate={marker}
              key={i}
            />
          ))}
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
    justifyContent: 'flex-end'
  },
  button: {
    backgroundColor: "#841584",
    padding: 15,
    marginBottom: 50,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 5,
    width: 200
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center'
  }
});

export default Root;