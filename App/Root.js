'use strict';

import React, { Component } from 'react';
import { isNumber } from 'lodash';
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
import betterTrilaterate from './helpers/aBetterTrilateration';
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
        '8ce79713-008d-47fc-b40c-7ccbb3bb19e9': { lat: 1.312310, lng: 103.858599 },
        '6d683042-4970-3258-5832-70494230686d': { lat: 1.312391, lng: 103.858601 },
        '4a4b441c-ebad-4efc-b35f-548b5439c5b1': { lat: 1.312375, lng: 103.858429 }
      },
      // React Native ListView datasource initialization
      dataSource: ds.cloneWithRows([]),
      userLocation: {},
      userLocation2: {},
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
        console.log(data)
        let beacons = [];
        data.beacons.forEach((beacon, i) => {
          const { uuid, distance } = beacon;

          if (whitelist[uuid] !== undefined) {
            const { lat, lng } = whitelist[uuid];
            beacons.push(new Beacon(lat, lng, distance));
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
            });
          }
        })

        if (beacons.length >= 3) {
          // Beacon trilateration
          const [userLat, userLng] = trilaterate(beacons);
          const userLocation = {
            latitude: userLat,
            longitude: userLng
          }

          this.setState({
            userLocation,
            //userLocation2
          });
        }

        return this.setState({
          dataSource: this.state.dataSource.cloneWithRows(data.beacons),
          markers
        });
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
    const { dataSource, displayData, markers, userLocation, userLocation2 } =  this.state;
    const userInterpolated = isNumber(userLocation.latitude) && isNumber(userLocation.longitude);
    console.log(`interpolated: ${userInterpolated}, location: ${userLocation.latitude}, ${userLocation.longitude}`)

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

          {
           userInterpolated &&
           <MapView.Marker
              coordinate={userLocation}
              key={'userLoc'}
              pinColor={'yellow'}
            />
          }
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
    justifyContent: 'flex-end'
  },
  button: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 50,
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