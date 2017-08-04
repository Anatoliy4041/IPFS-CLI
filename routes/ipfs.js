const express = require('express');
const router = express.Router();
const context = require('../context');
const multer = require('multer');
const fs = require('fs');
const authority = require('../lib/Authority');
const crypto = require('crypto');
const crypto_algorithm = 'aes-256-ctr';
const password = 'qwe123';

var authContract = null;
var buyInfoContract = null;
var eventCreateBuyInfo = null;
var eventDataUploadedInfo = null;
var eventDataClosed = null;
var trigger = null;

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.post('/upload', multer({storage: multer.memoryStorage()}).single('fileToUpload'), function(req, res, next) {
    if (!req.file) {
        res.redirect('/')
        return;
    }
    const fileBuffer = req.file.buffer;
    console.log(req.file);
    const cipher = crypto.createCipher(crypto_algorithm, password);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    context.ipfs.add(encrypted, function (err, info){
        if (err) {
            console.log(err);
        } else {
            console.log("Path in IPFS to uploaded file: " + info[0].path);
            res.render('upload', {fileInfo: info[0], title: "hey"});
        }
    })
})

router.post('/download',  multer({storage: multer.memoryStorage()}).single('pathToDownload'), function(req, res, next) {
    if (!req.body.pathToDownload) {
        res.redirect('/')
        return;
    }
    var path = req.body.pathToDownload;
    if (!path.startsWith("/ipfs/")){
        path = "/ipfs/" + path;
    }
    console.log("Path in IPFS to downloaded file: " + path);
    context.ipfs.get(path, function (err, stream) {
        stream.on('data', (filestream ) => {
            var filename = filestream.path;
            var file  = fs.createWriteStream(filename);
            res.setHeader('Content-disposition', 'attachment; filename=' + filename + ".jpg");
            res.setHeader('Content-type', "multipart/form-data");
            var decipher = crypto.createDecipher(crypto_algorithm,password)

            filestream.content.pipe(decipher).pipe(res);

            /*
            stream.on('end', function () {
                stream.close;
            })

            file.on('finish', function() {
                //file.close;  // close() is async, call cb after close completes.
                console.log(file);
                res.send(file);
            });*/

    })
    })
})

router.get('/display', function(req, res, next) {
    hash='/ipfs/QmTDBH6sJL91KYVrVRWSAK8T3wntwbnX7Dz8Dw8zfX2Azk';
    context.ipfs.cat(hash).then(function (buffer) {
        console.log(buffer.toString());
    })
})

router.get('/deploy', function(req, res, next) {

    if (trigger == null) {
        console.log("Initizlization");
        authContract = context.web3.eth.contract(authority.abiArray.abi).at("0x7c4d79bbba3cb5070f773de052c65190b23889ce");
        buyInfoContract = context.web3.eth.contract(authority.abiArrayBuyInfo.abi).at("0xd0b8dfae81b3415d8257e5e97ef0c06dd84ecf42");

        //console.log(contr);
        //authContract.createBuyContract.sendTransaction('t', 't', 't', 't', {value: 200, gas: 44000});


        //var result = contr.createBuyContract("0x7bc4baf3efcafc5d9b3ce495da88af295fc6b779", "1", "1", "1", {from: '0x7bc4baf3efcafc5d9b3ce495da88af295fc6b779', value: 20000, gas: 440000000}, function(err, res1){if (err) {console.log(err)} else {console.log("Contract mined! Address " + res1)}});

        eventCreateBuyInfo = authContract.ContractEvent({}, {fromBlock: 'latest', toBlock: 'latest'});//
        eventDataUploadedInfo = buyInfoContract.DataUploaded({}, {fromBlock: 'latest', toBlock: 'latest'});//
        eventDataClosed = buyInfoContract.Closed({}, {fromBlock: 'latest', toBlock: 'latest'});//
        trigger = 5;

    }

    // Events
    eventCreateBuyInfo.watch(function(error, result){
        // result will contain various information
        // including the argumets given to the Deposit
        // call.
        if (!error)
            console.log(error);
        console.log(result);
    })

    eventDataUploadedInfo.watch(function(error, result){
        // result will contain various information
        // including the argumets given to the Deposit
        // call.
        if (!error)
            console.log(error);
        console.log(result);
    })

    eventDataClosed.watch(function(error, result){
        // result will contain various information
        // including the argumets given to the Deposit
        // call.
        if (!error)
            console.log(error);
        console.log(result);
        console.log(result.args.state.c);
    })


    //////////////////////


    var resultBuyInfo = buyInfoContract.confirm( {from: '0x7bc4baf3efcafc5d9b3ce495da88af295fc6b779'}, function(err, res1){
        if (err) {
            console.log(err)
        } else {
            console.log("Contract confirm mined! Address " + res1);
        }});


    /*
    var resultBuyInfo = buyInfoContract.uploadData("Hello CR", {from: '0x7bc4baf3efcafc5d9b3ce495da88af295fc6b779'}, function(err, res1){
        if (err) {
            console.log(err)
        } else {
            console.log("Contract CR mined! Address " + res1);
        }});

    */

    //////////////////////////////
    //authContract.isBuyerBlocked("0x7bc4baf3efcafc5d9b3ce495da88af295fc6b779", function (err, resp) {console.log("Blocked seller " + resp)});
    /*
    buyInfoContract.uploadData("uplDat", {from: '0x7bc4baf3efcafc5d9b3ce495da88af295fc6b779'}, function (err, respns) {
        if (err) {
            console.log(err)
        } else {
            console.log("confirm " + respns);
        }
    })*/


    /*
    var result = authContract.createBuyContract("0x7bc4baf3efcafc5d9b3ce495da88af295fc6b779", "test1", "test2", "test3", {from: '0x7bc4baf3efcafc5d9b3ce495da88af295fc6b779', value: 200000, gas: 44000000000}, function(err, res1){
        if (err) {
            console.log(err)
        } else {
            console.log("createBuyContract mined! Address " + res1);



        }});
    */

    /*
    var ttt = event.get(function(error, logs){
        console.log(logs);
    });
    var filter = context.web3.eth.filter('pending');

    filter.watch(function (error, log) {
        console.log(log); //  {"address":"0x0000000000000000000000000000000000000000", "data":"0x0000000000000000000000000000000000000000000000000000000000000000", ...}
    });*/

// get all past logs again.
    //var myResults = filter.get(function(error, logs){console.log(logs) });



// stops and uninstalls the filter
 //   filter.stopWatching();



    res.redirect('/')
    //var auth = authority.authority();
    //console.log(auth);
    //console.log(authority.contractTest);

    /*
    authority.authority(function (err, ans) {
        console.log(ans);
    }).then(function (auth) {
       console.log(auth);
    })
    */

})


module.exports = router;