// mongo data 
const dbVariables = require('../config/databse')
const { getDB, connectDB } = require('../config/mongodb')
const { ObjectId } = require('mongodb');
const paginate = require('../utils/paginate');


//admin login data
exports.adminLogin = async (params) => {
    
    const db=getDB();
    let data =await db.collection(dbVariables.adminCollection).findOne({email:params})
    return data

}

//user list fetch
exports.userDataFetch = async() =>{
    const db = getDB();
    return await db.collection(dbVariables.userCollection).find().toArray();

}


exports.getPaginatedUsers = async (filter, sort, skip, limit) => {
  const db = getDB();
  
  const users = await db
    .collection(dbVariables.userCollection)
    .find(filter)
    .project({
      firstName: 1,
      lastName: 1,
      email: 1,
      phone: 1,
      isActive: 1,       
      createdAt: 1
    })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();

  const totalDocs = await db
    .collection(dbVariables.userCollection)
    .countDocuments(filter);

  return { data: users, totalDocs };
};


//controll user
exports.userControll =async (id) => {
try {
  
  const db = getDB();
  const user = await db.collection(dbVariables.userCollection).findOne({ _id: new ObjectId(id) })
  
 if (!user) {
    throw new Error('User not found');
  };
  

  if (user.isActive === true) {
    console.log("true");
    
    // Disable the user
   let result = await db.collection(dbVariables.userCollection).updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: false } }
    );
    console.log(result);
    return true
  } else if(user.isActive === false){
    // Enable the user
     console.log("true");
   let result = await db.collection(dbVariables.userCollection).updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: true } }
    );
    console.log(result);
  }
  
  
} catch (error) {
  console.log(error);
  res.send(error)
  
}

  
};
  
