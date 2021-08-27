const { MongoClient } = require("mongodb");

let db= null;

let getDb= function(connectionUri){
	this._connectionUri = connectionUri;
}

getDb.prototype.getDb = async function() {
	
	const client = new MongoClient(this._connectionUri);

	if (db == null) {
		try {
			await client.connect();
			db = client.db();

		} catch(err) {
			console.error(err);
			await client.close();
			process.exit(0);
		}
		return db;
	}
	return db;
}

module.exports = getDb;

