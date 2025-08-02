
// mongo data 
const dbVariables = require('../config/databse')
const { getDB } = require('../config/mongodb')

exports.insertUser = async (userdata) => {

    try {
        const db = getDB();
        let insertData = db.collection(dbVariables.userCollection).insertOne(userdata)
        return insertData
    } catch (error) {
        console.error(error);
        return res.status(500).render('error', { error: 'Server error. Please try again.' });
    }

}