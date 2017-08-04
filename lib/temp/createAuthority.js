var account = 'REPLACE';
var done = false;
loadScript('/contracts/personStorage.json');
var contracts = personStorage.contracts;

var contractName = '/contracts/personStorage.sol:Shop';
var contract = contracts[contractName];
console.error("Creating Authority");
var contractDefenition = web3.eth.contract(JSON.parse(contract.abi));
/*
var authorityContract = function () {
    contractDefenition.new({
        from: account,
        data: '0x' + contract.bin,
        gas: '4700000'
    }, function (e, contract) {
        if (e) {
            console.error(e);
        }
        if (typeof contract.address !== 'undefined') {
            done = true;
            console.log('contract-address: ' + contract.address);
        }
    })
}
*/
// This block is to detect pending transaction
var tumbler = true;
var filter = web3.eth.filter('pending');
filter.watch(function (error, log) {
    console.log("Pending transaction was caught:" + log);
    tumbler=false;
});

var timer = setInterval(function () {
    if (done) {
        clearInterval(timer);
        miner.stop();
        web3.reset(false);
    } else if (tumbler !== false){  // this condition is to block calling insurance_shop() if one has sent first transaction and callback hasn't fired
        insurance_shop();           // continuous calling of insurance_shop due to error's arise - "Insufficient funds for gas * price + value"
    }
}, 2000);
miner.start(4);
