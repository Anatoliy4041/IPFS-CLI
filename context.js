/**
 * Created by Anatoly on 20/07/2017.
 */

const config = require('./config');
const ipfsAPI = require('ipfs-api');
const moment = require('moment');
const Promise = require('bluebird');


const ipfs = ipfsAPI({host: config.ipfsNodeAddr, port: config.ipfsNodePort, protocol: config.ipfsNodeProtocol});

moment.locale(config.locale);

function getInfo() {
    return Promise.all([
        Promise.promisify(ipfs.id)(),
        Promise.promisify(ipfs.version)(),
    ]).spread(function (id, protocolVersion) {
        return {id: id.id, agentVersion: id.agentVersion, protocolVersion: protocolVersion.version}
    })
}

module.exports = {
    ipfs: ipfs,
    config: {host: config.ipfsNodeAddr, port: config.ipfsNodePort, protocol: config.ipfsNodeProtocol},
    moment: moment,
    info: getInfo
};