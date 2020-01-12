import * as d3 from 'd3';
import * as THREE from 'three';
import { BufferAttribute } from 'three';
import { DataStore } from './DataStore';
import { WindCalculator } from './WindCalculator';

async function start() {
    const data = require('../data/data.json');
    const dataStore = new DataStore(data);

    const geojson = await d3.json('https://gist.githubusercontent.com/d3indepth/f28e1c3a99ea6d84986f35ac8646fac7/raw/c58cede8dab4673c91a3db702d50f7447b373d98/ne_110m_land.json');
    window.setInterval(update, 100);

    const geoContext = (d3.select('#map').node() as HTMLCanvasElement).getContext('2d')!;
    const windCanvas = d3.select('#wind').node() as HTMLCanvasElement;

    const rotation: [number, number] = [0, 0];
    let dragInProgress = false;

    function dragged() {
        rotation[0] += d3.event.dx * 0.1;
        rotation[1] -= d3.event.dy * 0.1;
    }
    function dragStart() {
        dragInProgress = true;
        d3.select('#wind').style('opacity', 0);
        textureA.dispose();
        textureB.dispose();
    }
    function dragEnd() {
        rotation[0] += d3.event.dx * 0.1;
        rotation[1] -= d3.event.dy * 0.1;
        dragInProgress = false;
        windCalculator.reset();
        d3.select('#wind').style('opacity', 1);
        animationLoop();
    }

    const dragBehavior = d3.drag()
        .on("start", dragStart)
        .on("end", dragEnd)
        .on("drag", dragged);
    dragBehavior(d3.select('#wind'));

    const width = windCanvas.width;
    const height = windCanvas.height;

    const projection = d3.geoOrthographic()
        .translate([width/2, height/2])
        .scale(300);

    const geoGenerator = d3.geoPath()
        .projection(projection)
        .pointRadius(1)
        .context(geoContext);

    // Init three js 
    let textureA = new THREE.WebGLRenderTarget( width, height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
    let textureB = new THREE.WebGLRenderTarget( width, height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter} );

    const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    camera.position.z = 2;
    const bufferScene = new THREE.Scene();
    const scene = new THREE.Scene();
    const particleMaterial = new THREE.RawShaderMaterial({
        vertexShader: document.getElementById('vertexshader')?.textContent!,
        fragmentShader: document.getElementById('fragmentshader')?.textContent!,
        transparent: true
    });
    const bufferMaterial = new THREE.ShaderMaterial({
        uniforms: {
            bufferTexture: { type: "t", value: textureA },
            res : {type: 'v2',value:new THREE.Vector2(width, height)} //Keeps the resolution
        },
        fragmentShader: document.getElementById('fragmentShaderBlur')?.innerHTML,
        transparent: true
    });
    const finalMaterial =  new THREE.MeshBasicMaterial({map: textureB.texture});
    const geometry = new THREE.BufferGeometry();
    const particleSystem = new THREE.Points( geometry, particleMaterial );
    const plane = new THREE.PlaneBufferGeometry(width, height);
    const bufferObject = new THREE.Mesh( plane, bufferMaterial );
    const quad = new THREE.Mesh( plane, finalMaterial );
    bufferScene.add( particleSystem );
    bufferScene.add( bufferObject );
    scene.add(quad);
    const renderer = new THREE.WebGLRenderer({ canvas: windCanvas, alpha: true });

    const windCalculator = new WindCalculator(10_000, projection, dataStore, width, height);
    geometry.setAttribute( 'position', new THREE.BufferAttribute( windCalculator.vertices, 3 ) );

    function animationLoop() {
        //Draw to textureB
        renderer.setRenderTarget(textureB);
        renderer.render(bufferScene, camera);

        //Swap textureA and B
        const t = textureA;
        textureA = textureB;
        textureB = t;
        finalMaterial.map = textureB.texture;
        bufferMaterial.uniforms.bufferTexture.value = textureA;

        //Finally, draw to the screen
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);

        if (!dragInProgress) {
            requestAnimationFrame(animationLoop)
        }
    }
    animationLoop();


    function update() {
        projection.rotate(rotation);
        windCalculator.calculateNextPosition();
        windCalculator.generateNewPositions(100);
        (geometry.attributes.position as BufferAttribute).needsUpdate = true;

        geoContext.clearRect(0, 0, 800, 800);
    
        geoContext.lineWidth = 1;
        geoContext.strokeStyle = '#333';
    
        geoContext.beginPath();
        geoGenerator({type: 'FeatureCollection', features: geojson.features})
        geoContext.stroke();

        // Graticule
        // var graticule = d3.geoGraticule();
        // geoContext.beginPath();
        // geoContext.strokeStyle = '#ccc';
        // geoGenerator(graticule());
        // geoContext.stroke();

    }
}

start();
