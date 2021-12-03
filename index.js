let model= require('./lib/model');

const Ajv = require("ajv");
const ajvKeywords = require("ajv-keywords");
const ajvFormats = require("ajv-formats");

const getDb = require("./mongoDb/getDb");
const ObjectId= require("mongodb").ObjectId;
var ISODateRegex= /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;

let magnosaurus= function({connectionUri,ajvConfig={}}={connectionUri:"mongodb://localhost:27017/test"}) {
	this._connectionUri = connectionUri;
	this._getDb= new getDb(connectionUri);
	this._ajv = new Ajv(ajvConfig);
	this._ajvWithouDefaults = new Ajv({
		...ajvConfig,
		useDefaults: false
	});
	ajvKeywords(this._ajv);
	ajvFormats(this._ajv);
	ajvKeywords(this._ajvWithouDefaults);
	ajvFormats(this._ajvWithouDefaults);

	const objectIdKeyword = {
		keyword: "isObjectId",
		schema: false,
		modifying: true,
		validate: function (data, parent) {
			if (ObjectId.isValid(data)) {
				parent.parentData[parent.parentDataProperty] = ObjectId(data);
				return true;
			} else return false;
		},
		errors: true
	};

	this._ajv.addKeyword(objectIdKeyword);
	this._ajvWithouDefaults.addKeyword(objectIdKeyword);

	const dateKeyword = {
		keyword: "isDate",
		schema: false,
		modifying: true,
		validate: function (data, parent) {

			if ((typeof data == "string" && ISODateRegex.test(data)) || (typeof data == "number") || (data instanceof Date)) {
				parent.parentData[parent.parentDataProperty] = new Date(data);
				return true;
			} else return false;
		},
		errors: true
	};

	this._ajv.addKeyword(dateKeyword);
	this._ajvWithouDefaults.addKeyword(dateKeyword);
}

magnosaurus.prototype.model= function(modeDefinition) {
	return new model(modeDefinition, this._getDb, this._ajv, this._ajvWithouDefaults);
}

magnosaurus.prototype.db= async function() {
	return await this._getDb.getDb();
}

magnosaurus.prototype.ajv= function() {
	return this._ajv;
}

module.exports= magnosaurus;

