const express = require('express');
const bodyParser = require('body-parser');
const trilat = require('trilat');

const app = express();

app.use(bodyParser.json())

app.post('/', (req, res) => {
  const beacons = req.body;
  const input = beacons.map(beacon => {
    return [beacon.lat, beacon.lon, -beacon.dist];
  });
  const [lat, lng] = trilat(input);

  res.json({ lat, lng });
});

app.listen(3000);