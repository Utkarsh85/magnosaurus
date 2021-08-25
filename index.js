let model= require('./lib/model');

const Ajv = require("ajv");
const ajvKeywords = require("ajv-keywords");
const ajvFormats = require("ajv-formats");

const getDb = require("./mongoDb/getDb");

let magnosaurus= function({connectionUri,ajvConfig={}}) {
	this._connectionUri = connectionUri;
	this._getDb= new getDb(connectionUri);
	this._ajv = new Ajv(ajvConfig);
	ajvKeywords(this._ajv);
	ajvFormats(this._ajv);
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

