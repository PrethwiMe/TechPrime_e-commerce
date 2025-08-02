var express = require('express');
var router = express.Router();
const adminController=require('../controller/admincontroller')

/* GET admin base route */
router.get('/', adminController.sentAdminPage);

router.post('/getLoginData',adminController.loginfunction)

module.exports = router;
