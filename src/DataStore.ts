type LonLat = [number, number];
export type Wind = [number, number];

interface DataVariable {
    header: {
        parameterNumberName: string,
        gridDefinitionTemplateName: string,
        gridUnits: string,
        numberPoints: number,
        lo1: number,
        la1: number,
        lo2: number,
        la2: number,
        dx: number,
        dy: number
    },
    data: number[]
}

export class DataStore {
    private windU = new Map<string, number>();
    private windV = new Map<string, number>();

    constructor(data: DataVariable[]) {
        data.forEach(variable => {
            let map: Map<string, number> | null = null;
            if (variable.header.parameterNumberName === 'U-component_of_wind') {
                map = this.windU;
            }
            if (variable.header.parameterNumberName === 'V-component_of_wind') {
                map = this.windV;
            }
            if (map) {
                this.populateMap(map, variable);
            }
        });
    }
    
    private populateMap(map: Map<string, number>, variable: DataVariable) {
        console.log('Loading variable', {variableName: variable.header.parameterNumberName});
        if (variable.header.gridDefinitionTemplateName !== 'Latitude_Longitude') console.warn('Unknown gridDefinitionTemplateName', {gridDefinitionTemplateName: variable.header.gridDefinitionTemplateName})
        let index = 0;
        for (let lat = variable.header.la1; lat >= variable.header.la2 ; lat -= variable.header.dy) {
            for (let lon = variable.header.lo1; lon <= variable.header.lo2 ; lon += variable.header.dx) {
                map.set(this.key(lon, lat), variable.data[index]);
                index += 1;
            }
        }
        if (variable.header.numberPoints !== index) {
            console.warn('Index and number of points differ', {index, numberPoints: variable.header.numberPoints, gridDefinitionTemplateName: variable.header.gridDefinitionTemplateName});
        }
    }

    getWind(pointCoordinates: LonLat): Wind | null {
        const safePointCoordinates = this.toSafeCoordinates(pointCoordinates);
        const coordinates: LonLat[] = [
            [Math.floor(safePointCoordinates[0]), Math.floor(safePointCoordinates[1])],
            [Math.floor(safePointCoordinates[0]), Math.ceil(safePointCoordinates[1])],
            [Math.ceil(safePointCoordinates[0]), Math.floor(safePointCoordinates[1])],
            [Math.ceil(safePointCoordinates[0]), Math.ceil(safePointCoordinates[1])]
        ];
        const windPoints = coordinates.map(c => this.key(...c)).map(key => ([this.windU.get(key), this.windV.get(key)] as [number, number]));
        return this.linearInterpolation<Wind>(windPoints, coordinates, safePointCoordinates);
    }

    /** Make sure the coordinates are in the format lat: [-90, 90], lon: [0, 360] */
    private toSafeCoordinates(pointCoordinates: LonLat): LonLat {
        if (pointCoordinates[1] > 90 || pointCoordinates[1] < -90) {
            throw new Error('Latitude out of bound');
        }
        if (pointCoordinates[0] > 360 || pointCoordinates[0] < -180) {
            throw new Error('Longitude out of bound');
        }
        if (pointCoordinates[0] < 0) {
            return [
                pointCoordinates[0] + 360,
                pointCoordinates[1]
            ]
        }
        return pointCoordinates;
    }

    private linearInterpolation<T>(variablePoints: (T | undefined)[], variablePointCoordinates: LonLat[], pointCoordinates: LonLat) {
        if (variablePoints.length !== 4 || variablePointCoordinates.length !== 4) {
            console.error('Assertion error');
        }
        for (const variablePoint of variablePoints) {
            if (!variablePoint) {
                console.warn('Variable not defined in point', {variablePoints, variablePointCoordinates, pointCoordinates});
                return null;
            }
        }
        // TODO(gianluca): implement proper interpolation
        return variablePoints[0]!;
    }

    private key(lon: number, lat: number) {
        return `${Math.floor(lat)}-${Math.floor(lon)}`;
    }
}