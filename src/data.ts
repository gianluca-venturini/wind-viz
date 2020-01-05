import { exec as execWithCallback } from 'child_process';
import * as fs from 'fs';
import request from 'request';
import { promisify } from 'util';

const exec = promisify(execWithCallback);

const BASE_URL = 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_1p00.pl';
const DATA_DIR = 'data';
const FILE_PATH_GRB2 = `${DATA_DIR}/data.grb2`;
const FILE_PATH_JSON = `${DATA_DIR}/data.json`;

async function saveGrbFile(filePath: string) {
    return new Promise((resolve, reject) => 
        request(
            BASE_URL,
            {
                qs: {
                    lev_10_m_above_ground: 'on',
                    lev_surface: 'on',
                    var_TMP: 'on',
                    var_UGRD: 'on',
                    var_VGRD: 'on',
                    leftlon: 0,
                    rightlon: 360,
                    toplat: 90,
                    bottomlat: -90,
                    dir: '/gfs.20200104/00',
                    file: 'gfs.t00z.pgrb2.1p00.f000'
                }
            },
            error => { if (error) reject(error); else resolve(); }
        ).pipe(fs.createWriteStream(filePath))
    );
}

async function grbToJson(inFilePath: string, outFilePath: string) {
    await exec(`converter/bin/grib2json --data --output ${outFilePath} --names --compact ${inFilePath}`)
}


async function generateData() {
    console.log('Saving GRB2 data', {FILE_PATH_GRB2})
    await saveGrbFile(FILE_PATH_GRB2);
    console.log('Saved correctly');
    
    console.log('Converting GRB2 into JSON', {FILE_PATH_GRB2, FILE_PATH_JSON})
    grbToJson(FILE_PATH_GRB2, FILE_PATH_JSON);
    console.log('Converted correctly');
}

generateData();
