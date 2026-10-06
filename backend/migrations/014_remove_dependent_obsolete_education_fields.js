const mongoose = require("mongoose");
const id = "014_remove_dependent_obsolete_education_fields";
async function run(){
  const db=mongoose.connection.db; if(!db) throw new Error("MongoDB database is not connected.");
  const result=await db.collection("dependents").updateMany({$or:[{school:{$exists:true}},{educationLevel:{$exists:true}}]},{$unset:{school:"",educationLevel:""}});
  console.log(`[migration] ${id}: removed obsolete school/educationLevel from ${result.modifiedCount||0} dependent document(s).`);
}
module.exports={id,run};
