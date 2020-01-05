import * as d3 from 'd3';
import { DataStore } from './DataStore';

async function start() {
    const data = require('../data/data.json');
    const dataStore = new DataStore(data);

    const geojson = await d3.json('https://gist.githubusercontent.com/d3indepth/f28e1c3a99ea6d84986f35ac8646fac7/raw/c58cede8dab4673c91a3db702d50f7447b373d98/ne_110m_land.json');
    window.setInterval(update, 10);

    const geoContext = (d3.select('#map').node() as HTMLCanvasElement).getContext('2d')!;
    const windCanvas = d3.select('#wind').node() as HTMLCanvasElement;
    const windContext = windCanvas.getContext('2d')!;
    let offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = windCanvas.width;
    offscreenCanvas.height = windCanvas.height;
    const windOffscreenContext = offscreenCanvas.getContext('2d')!;

    var projection = d3.geoOrthographic()
        .scale(300);

    var geoGenerator = d3.geoPath()
        .projection(projection)
        .pointRadius(1)
        .context(geoContext);

    var windGenerator = d3.geoPath()
        .projection(projection)
        .pointRadius(1)
        .context(windContext);

    
    var yaw = 300;

    const points: [number, number][] = [];
    addPoints(points, 2000);

    function update() {
        points.forEach(point => {
            const wind = dataStore.getWind(point);
            if (wind) {
                point[0] += wind[0] * 0.01;
                point[1] += wind[1] * 0.01;
            }
        })

        geoContext.clearRect(0, 0, 800, 800);
        windOffscreenContext.clearRect(0, 0, 800, 800);
        windOffscreenContext.globalAlpha = 0.99;
        windOffscreenContext.drawImage(windCanvas, 0, 0);
        windContext.clearRect(0, 0, 800, 800);
        windContext.drawImage(offscreenCanvas, 0, 0);

        geoContext.lineWidth = 1;
        geoContext.strokeStyle = '#333';
        windContext.lineWidth = 0.1;
        windContext.strokeStyle = '#333';

        windContext.beginPath();
        points.forEach(point => windGenerator({type: 'Point', coordinates: point})); 
        windContext.stroke();

        geoContext.beginPath();
        geoGenerator({type: 'FeatureCollection', features: geojson.features})
        geoContext.stroke();

        // Graticule
        // var graticule = d3.geoGraticule();
        // geoContext.beginPath();
        // geoContext.strokeStyle = '#ccc';
        // geoGenerator(graticule());
        // geoContext.stroke();

        deletePoints(points, 100);
        addPoints(points, 100);
    }

    console.log(data);
}

function addPoints(points: [number, number][], num: number) {
    for (let i = 0; i < num; i++) {
        const lat = Math.random() * 180 - 90;
        const lon = Math.random() * 360;
        points.push([lon, lat]);
    }
}

function deletePoints(points: [number, number][], num: number) {
    for (let i = 0; i < num; i++) {
        if (points.length === 0) {
            return;
        }
        delete points[0];
    }
}

start();
