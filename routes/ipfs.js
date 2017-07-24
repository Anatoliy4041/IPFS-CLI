const express = require('express');
const router = express.Router();
const context = require('../context');
const multer = require('multer');
const fs = require('fs');

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
    context.ipfs.add(fileBuffer, function (err, info){
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
    //hash='/ipfs/QmTDBH6sJL91KYVrVRWSAK8T3wntwbnX7Dz8Dw8zfX2Azk';
    context.ipfs.get(path, function (err, stream) {
        stream.on('data', (filestream ) => {
        var filename = filestream.path;
        //var file  = fs.createWriteStream(filename);
        res.setHeader('Content-disposition', 'attachment; filename=' + filename + ".jpg");
        res.setHeader('Content-type', "multipart/form-data");
        filestream.content.pipe(res);
        return;
        /*
        file.on('finish', function() {
            file.close;  // close() is async, call cb after close completes.
            console.log(file);
            file.pipe(res);
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


module.exports = router;
