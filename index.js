let model= require('./lib/model');

const Ajv = require("ajv");
const ajvKeywords = require("ajv-keywords");
const ajvFormats = require("ajv-formats");

const getDb = require("./mongoDb/getDb");
const ObjectId= require("mongodb").ObjectId;

let magnosaurus= function({connectionUri,ajvConfig={}}={connectionUri:"mongodb://localhost:27017/test"}) {
	this._connectionUri = connectionUri;
	this._getDb= new getDb(connectionUri);
	this._ajv = new Ajv(ajvConfig);
	ajvKeywords(this._ajv);
	ajvFormats(this._ajv);

	this._ajv.addKeyword({
		keyword: "isObjectId",
		validate: (schema, data) =>
			typeof schema == "boolean" && schema == true  ? ObjectId.isValid(data)&& typeof data == "object": false,
		errors: true
	})
}

magnosaurus.prototype.model= function(modeDefinition) {
	return new model(modeDefinition,this._getDb,this._ajv);
}

magnosaurus.prototype.db= async function() {
	return await this._getDb.getDb();
}

magnosaurus.prototype.ajv= function() {
	return this._ajv;
}

module.exports= magnosaurus;

