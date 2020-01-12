import { DataStore } from "./DataStore";

const OFFSCREEN_Z = -2;

export class WindCalculator {
    private nextElementIndex = 0;
    private _vertices: Float32Array;

    constructor(
        private numPositions: number, 
        private projection: d3.GeoProjection, 
        private dataStore: DataStore, 
        private width: number, 
        private height: number
    ) {
        this._vertices = new Float32Array( numPositions * 3 );
        this.reset();
    }

    get vertices(): Float32Array {
        return this._vertices;
    }

    public reset() {
        this.generateNewPositions(this.numPositions);
    }

    public calculateNextPosition() {
        const numVertices = this._vertices.length / 3;
        for (let index = 0; index < numVertices; index++) {
            const geoCoordinates = this.toGeoCoordinates(
                this._vertices[index * 3 + 0],
                this._vertices[index * 3 + 1]
            );
            if (!geoCoordinates) {
                // Send the point offscreen
                this._vertices[index * 3 + 2] = OFFSCREEN_Z;
                continue;
            }
            const wind = this.dataStore.getWind(geoCoordinates);
            if (!wind) {
                // Send the point offscreen
                this._vertices[index * 3 + 2] = OFFSCREEN_Z;
                continue;
            }
            geoCoordinates[0] += wind[0] * 0.1;
            geoCoordinates[1] += wind[1] * 0.1;
            const glCoordinates = this.toGlCoordinates(geoCoordinates[0], geoCoordinates[1]);
            if(!glCoordinates) {
                // Send the point offscreen
                this._vertices[index * 3 + 2] = OFFSCREEN_Z;
                continue;
            }
            this._vertices[index * 3 + 0] = glCoordinates[0];
            this._vertices[index * 3 + 1] = glCoordinates[1];
            this._vertices[index * 3 + 2] = 0;
        }
    }

    public generateNewPositions(numNewPositions: number) {
        for (let i = 0; i < numNewPositions; i++) {
            this.generateNewPosition();
        }
    }

    private generateNewPosition() {
        const lon = Math.random() * 360;
        const lat = Math.random() * 180 - 90;
    
        const glCoordinates = this.toGlCoordinates(lon, lat);
    
        if (glCoordinates) {
            this._vertices[this.nextElementIndex * 3 + 0] = glCoordinates[0];
            this._vertices[this.nextElementIndex * 3 + 1] = glCoordinates[1];
            this._vertices[this.nextElementIndex * 3 + 2] = 0;
        } else {
            // Send the point offscreen
            this._vertices[this.nextElementIndex * 3 + 2] = OFFSCREEN_Z;
        }
        this.nextElementIndex += 1;
        if (this.nextElementIndex >= this.numPositions) {
            this.nextElementIndex = 0;
        }
    }

    private toGlCoordinates(lon: number, lat: number): [number, number] | null {
        const canvasCoordinates = this.projection([lon, lat]);
        if (!canvasCoordinates || isNaN(canvasCoordinates[0]) || isNaN(canvasCoordinates[1])) {
            return null;
        }
        return [
            ((canvasCoordinates[0] / this.width) - 0.5) * 2,
            -((canvasCoordinates[1] / this.height) - 0.5) * 2
        ]
    }

    private toGeoCoordinates(x: number, y: number): [number, number] | null {
        return this.projection.invert!([
            ((x / 2) + 0.5) * this.width, 
            ((-y / 2) + 0.5)  * this.height
        ]);
    }
}