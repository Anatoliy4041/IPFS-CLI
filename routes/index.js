const express = require('express');
const router = express.Router();
const context = require('../context');

/* GET home page. */
router.get('/', function(req, res, next) {
    context.info().then( function(info) {
        res.render('index', {nodeInfo: info, config: context.config});
    });
});

router.get('/info', function(req, res, next) {
    context.info().then( function(info) {
        res.render('info', {title: 'IPFS web module', nodeInfo: info, config: context.config});
    });
})

router.get('/ipfs', function(req, res, next) {
    res.render('ipfs', {title: 'IPFS web module'});
})

module.exports = router;
