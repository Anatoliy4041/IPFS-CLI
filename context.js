/**
 * Created by Anatoly on 20/07/2017.
 */

const config = require('./config');
const ipfsAPI = require('ipfs-api');
const moment = require('moment');
const Promise = require('bluebird');
const Web3 = require('web3');
const solc = require('solc');


// Geth context

const web3 = new Web3(new Web3.providers.HttpProvider(config.gethProvider));

// IPFS context
const ipfs = ipfsAPI({host: config.ipfsNodeAddr, port: config.ipfsNodePort, protocol: config.ipfsNodeProtocol});

moment.locale(config.locale);

function getInfo() {
    return Promise.all([
        Promise.promisify(web3.version.getNode)(),
        Promise.promisify(web3.version.getNetwork)(),
        Promise.promisify(web3.version.getEthereum)(),
        Promise.promisify(web3.eth.getCoinbase)(),
        Promise.promisify(ipfs.id)(),
        Promise.promisify(ipfs.version)()
    ]).spread(function (nodeVersion, networkId, ethereumVersion, coinbase, id, protocolVersion) {
        return {
            gethNodeInfo: {version: {node: nodeVersion, ethereum: ethereumVersion}, network: networkId, coinbase: coinbase},
            ipfsNodeInfo: {id: id.id, version: {agentVersion: id.agentVersion, protocolVersion: protocolVersion.version}}
        }
    })
}

module.exports = {
    web3: web3,
    ipfs: ipfs,
    config: {gethProvider: config.gethProvider, ipfsHost: config.ipfsNodeAddr, ipfsPort: config.ipfsNodePort, protocol: config.ipfsNodeProtocol},
    moment: moment,
    info: getInfo
};